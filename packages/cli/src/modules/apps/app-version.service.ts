import type { AppVersion as AppVersionResponse } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { extract as extractTar, list as listTar } from 'tar';

import { AppVersionBlobStore, type StoredAppVersionBlob } from './app-version-blob-store';
import type { AppVersion } from './app-version.entity';
import { AppVersionRepository } from './app-version.repository';
import type { App } from './app.entity';
import { AppRepository } from './app.repository';
import { AppBlobSizeQuotaExceededError } from './errors/app-blob-size-quota-exceeded.error';
import { AppNotFoundError } from './errors/app-not-found.error';
import { AppVersionNotPublishableError } from './errors/app-version-not-publishable.error';
import { AppVersionQuotaExceededError } from './errors/app-version-quota-exceeded.error';
import { InvalidAppVersionTarballError } from './errors/invalid-app-version-tarball.error';
import { createDistTarFilter, DIST_TAR_LIMITS } from './serving/dist-tar-filter';

export const MAX_TARBALL_BYTES = 20 * 1024 * 1024;

/** Bound on what a tarball may unpack to, so a small upload cannot cost gigabytes of gunzip. */
const MAX_UNPACKED_BYTES = { source: 200 * 1024 * 1024, dist: DIST_TAR_LIMITS.maxBytes };

/**
 * The newest five dist tarballs of an app are kept; the active version's dist is
 * always kept. Older versions keep their source only.
 */
const DIST_RETENTION = 5;

/**
 * Source snapshots (versions without a dist) are taken after every assistant
 * turn; the newest twenty are kept. Old builds whose dist was pruned count as
 * source-only too, so this also bounds the history of published sources.
 */
const SOURCE_SNAPSHOT_RETENTION = 20;

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

const isErrnoCode = (error: unknown, codes: string[]) =>
	error instanceof Error && 'code' in error && codes.includes(String(error.code));

@Service()
export class AppVersionService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly blobStore: AppVersionBlobStore,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	async create(
		appId: string,
		projectId: string,
		source: Buffer,
		dist: Buffer,
	): Promise<AppVersion> {
		await this.assertUnderQuota(appId, projectId, source.length + dist.length);

		await this.assertTarball('source', source);
		const distEntries = await this.assertTarball('dist', dist, createDistTarFilter());
		if (!distEntries.some((entry) => path.posix.normalize(entry) === 'index.html')) {
			throw new InvalidAppVersionTarballError('dist', 'has no index.html at its root');
		}

		const versionId = generateNanoId();
		const version = await this.storeVersion(appId, versionId, source, dist);
		await this.appRepository.setActiveVersionId(appId, versionId);
		await this.pruneDist(appId, versionId);

		return version;
	}

	/**
	 * Cheapest checks first, before any tarball parsing CPU cost. The app's
	 * existence is guaranteed by the caller, so this only checks quotas.
	 */
	private async assertUnderQuota(
		appId: string,
		projectId: string,
		addedBytes: number,
	): Promise<void> {
		const versionCount = await this.appVersionRepository.countByAppId(appId);
		if (versionCount >= this.globalConfig.apps.maxVersionsPerApp) {
			throw new AppVersionQuotaExceededError(
				this.globalConfig.apps.maxVersionsPerApp,
				versionCount,
			);
		}

		const projectSize = await this.appVersionRepository.sumSizeByProjectId(projectId);
		const newSize = projectSize + addedBytes;
		if (newSize > this.globalConfig.apps.maxProjectBlobSize) {
			throw new AppBlobSizeQuotaExceededError(this.globalConfig.apps.maxProjectBlobSize, newSize);
		}
	}

	/**
	 * Stores the working copy without publishing it: no dist, the active version
	 * stays as it is. `readSource` (and so `apps restore`) picks it up as the newest.
	 */
	async createSourceSnapshot(appId: string, source: Buffer): Promise<AppVersion> {
		const app = await this.appRepository.findOneBy({ id: appId });
		if (!app) throw new AppNotFoundError(appId);
		await this.assertUnderQuota(appId, app.projectId, source.length);
		await this.assertTarball('source', source);

		const versionId = generateNanoId();
		const sourceBlob = await this.blobStore.write({ appId, versionId, kind: 'source' }, source);
		const version = await this.appVersionRepository
			.insertVersion({
				id: versionId,
				appId,
				storedAt: sourceBlob.storedAt,
				sourceStorageKey: sourceBlob.storageKey,
				distStorageKey: null,
				sourceSizeBytes: source.length,
				distSizeBytes: null,
			})
			.catch(async (error: unknown) => {
				await this.blobStore.delete([sourceBlob]);
				throw error;
			});
		await this.pruneSourceSnapshots(appId, app.activeVersionId);

		return version;
	}

	/** Writes both blobs and the row; a failure at any step deletes the blobs written so far. */
	private async storeVersion(
		appId: string,
		versionId: string,
		source: Buffer,
		dist: Buffer,
	): Promise<AppVersion> {
		const written: StoredAppVersionBlob[] = [];
		try {
			const sourceBlob = await this.blobStore.write({ appId, versionId, kind: 'source' }, source);
			written.push(sourceBlob);
			const distBlob = await this.blobStore.write({ appId, versionId, kind: 'dist' }, dist);
			written.push(distBlob);
			return await this.appVersionRepository.insertVersion({
				id: versionId,
				appId,
				storedAt: sourceBlob.storedAt,
				sourceStorageKey: sourceBlob.storageKey,
				distStorageKey: distBlob.storageKey,
				sourceSizeBytes: source.length,
				distSizeBytes: dist.length,
			});
		} catch (error) {
			await this.blobStore.delete(written);
			throw error;
		}
	}

	async list(appId: string): Promise<AppVersion[]> {
		return await this.appVersionRepository.listByAppId(appId);
	}

	/**
	 * Source tarball of the newest version, snapshot or build. The active version
	 * is the published one; the newest is the working copy, which is what a
	 * restore (agent or Theme tab) must continue from.
	 */
	async readSource(app: App): Promise<{ versionId: string; data: Buffer } | null> {
		const [version] = await this.appVersionRepository.listByAppId(app.id);
		if (!version) return null;

		const data = await this.blobStore.readAsBuffer({
			storedAt: version.storedAt,
			storageKey: version.sourceStorageKey,
		});
		return data ? { versionId: version.id, data } : null;
	}

	/**
	 * `src/router.ts` of the same version `readSource` would return, or `null`
	 * when the app has no version, or that version's source has no
	 * `src/router.ts` (e.g. an app scaffolded with `template: "none"`).
	 * Extracted to a throwaway directory and discarded once read — unlike
	 * `distDir`, nothing here is served repeatedly, so there's nothing worth
	 * caching.
	 */
	async readRouterSource(app: App): Promise<string | null> {
		const source = await this.readSource(app);
		if (!source) return null;

		const tempDir = path.join(this.instanceSettings.n8nFolder, 'apps', `${randomUUID()}-src-tmp`);
		await mkdir(tempDir, { recursive: true });
		try {
			// Source tarballs hold arbitrary project files, not just the served
			// dist output, so extraction only needs the dist filter's path-safety
			// checks — its file-type/size limits are dist-specific and don't apply.
			await this.extract(
				source.data,
				tempDir,
				createDistTarFilter({ ...DIST_TAR_LIMITS, maxBytes: MAX_UNPACKED_BYTES.source }),
			);
			return await readFile(path.join(tempDir, 'src', 'router.ts'), 'utf8');
		} catch (error) {
			if (isErrnoCode(error, ['ENOENT'])) return null;
			throw error;
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	}

	/**
	 * True when a version newer than the published one exists: a per-turn snapshot
	 * after the last publish, or any version while nothing is published yet.
	 */
	async hasUnpublishedChanges(app: App): Promise<boolean> {
		const versions = await this.appVersionRepository.listByAppId(app.id);
		const [newest] = versions;
		if (!newest) return false;
		const active = versions.find((version) => version.id === app.activeVersionId);
		return !active || newest.createdAt > active.createdAt;
	}

	/**
	 * Serves `versionId` at `/apps/<namespace>/`, or nothing when null. Only a
	 * version of this app that still has its dist can be served.
	 */
	async setActiveVersion(app: App, versionId: string | null): Promise<void> {
		if (versionId !== null) {
			const version = await this.appVersionRepository.findById(versionId);
			if (!version || version.appId !== app.id) {
				throw new AppVersionNotPublishableError(versionId, 'it does not belong to this app');
			}
			if (!version.distStorageKey) {
				throw new AppVersionNotPublishableError(versionId, 'it has no build to serve');
			}
		}
		await this.appRepository.setActiveVersionId(app.id, versionId);
	}

	toResponse(version: AppVersion, activeVersionId: string | null): AppVersionResponse {
		const hasDist = version.distStorageKey !== null;
		return {
			id: version.id,
			appId: version.appId,
			createdAt: version.createdAt.toISOString(),
			hasDist,
			isActive: version.id === activeVersionId,
			kind: hasDist ? 'publish' : 'snapshot',
		};
	}

	/**
	 * Directory holding the extracted dist of a version, extracted on first use.
	 * Extraction lands in a sibling temp dir and is renamed into place, so a
	 * concurrent request either sees the complete directory or none.
	 */
	async distDir(version: AppVersion): Promise<string> {
		const dir = this.cacheDir(version.id);
		if (await this.isDir(dir)) return dir;

		if (!version.distStorageKey) {
			throw new UnexpectedError(`App version ${version.id} has no dist to serve`);
		}
		const tarball = await this.blobStore.readAsBuffer({
			storedAt: version.storedAt,
			storageKey: version.distStorageKey,
		});
		if (!tarball) throw new UnexpectedError(`Dist tarball of app version ${version.id} is gone`);

		const tempDir = `${dir}.tmp-${randomUUID()}`;
		await mkdir(tempDir, { recursive: true });
		try {
			await this.extract(tarball, tempDir);
			await rename(tempDir, dir);
		} catch (error) {
			await rm(tempDir, { recursive: true, force: true });
			// Another request extracted the same version first; its copy is identical.
			if (!isErrnoCode(error, ['EEXIST', 'ENOTEMPTY'])) throw error;
		}
		return dir;
	}

	async deleteAllForApp(appId: string): Promise<void> {
		const versions = await this.appVersionRepository.listByAppId(appId);
		const blobs = versions.flatMap((version): StoredAppVersionBlob[] => [
			{ storedAt: version.storedAt, storageKey: version.sourceStorageKey },
			...(version.distStorageKey
				? [{ storedAt: version.storedAt, storageKey: version.distStorageKey }]
				: []),
		]);
		await this.blobStore.delete(blobs);
		await this.removeCacheDirs(versions.map((version) => version.id));
		await this.appVersionRepository.deleteByAppId(appId);
	}

	private async pruneSourceSnapshots(appId: string, activeVersionId: string | null) {
		const prunable = await this.appVersionRepository.findSourceOnlyPrunable(
			appId,
			SOURCE_SNAPSHOT_RETENTION,
			activeVersionId,
		);
		if (prunable.length === 0) return;

		await this.blobStore.delete(
			prunable.map((version) => ({
				storedAt: version.storedAt,
				storageKey: version.sourceStorageKey,
			})),
		);
		await this.appVersionRepository.deleteByIds(prunable.map((version) => version.id));
	}

	private async pruneDist(appId: string, activeVersionId: string): Promise<void> {
		const prunable = await this.appVersionRepository.findDistPrunable(
			appId,
			DIST_RETENTION,
			activeVersionId,
		);
		if (prunable.length === 0) return;

		await this.blobStore.delete(
			prunable.flatMap((version) =>
				version.distStorageKey
					? [{ storedAt: version.storedAt, storageKey: version.distStorageKey }]
					: [],
			),
		);
		await this.appVersionRepository.clearDist(prunable.map((version) => version.id));
		await this.removeCacheDirs(prunable.map((version) => version.id));
	}

	/** Paths of the entries the filter accepted. */
	private async assertTarball(
		kind: 'source' | 'dist',
		body: Buffer,
		filter?: ReturnType<typeof createDistTarFilter>,
	): Promise<string[]> {
		if (body.length > MAX_TARBALL_BYTES) {
			throw new InvalidAppVersionTarballError(kind, `larger than ${MAX_TARBALL_BYTES} bytes`);
		}
		if (body.length < 2 || !body.subarray(0, 2).equals(GZIP_MAGIC)) {
			throw new InvalidAppVersionTarballError(kind, 'not a gzip file');
		}
		const maxUnpackedBytes = MAX_UNPACKED_BYTES[kind];
		const entries: string[] = [];
		// `strict` turns malformed headers, truncation and gunzip failures into errors.
		// The whole body goes in with one write, so tar's decompression ratio is
		// checked against the full compressed size and acts as an unpacked-bytes budget.
		const parser = listTar({
			strict: true,
			filter,
			maxDecompressionRatio: maxUnpackedBytes / body.length,
			onentry: (entry) => entries.push(entry.path),
		});
		await new Promise<void>((resolve, reject) => {
			parser.on('error', reject);
			parser.on('end', resolve);
			parser.end(body);
		}).catch((error: unknown) => {
			// tar's own abort carries `TAR_ABORT`; a gunzip failure keeps its zlib code.
			if (isErrnoCode(error, ['TAR_ABORT'])) {
				throw new InvalidAppVersionTarballError(
					kind,
					`unpacks to more than ${maxUnpackedBytes} bytes`,
				);
			}
			const reason = error instanceof Error ? error.message : String(error);
			throw new InvalidAppVersionTarballError(kind, `not a tar archive (${reason})`);
		});
		return entries;
	}

	private async extract(
		tarball: Buffer,
		cwd: string,
		filter: ReturnType<typeof createDistTarFilter> = createDistTarFilter(),
	): Promise<void> {
		const unpack = extractTar({ cwd, strip: 0, filter });
		await new Promise<void>((resolve, reject) => {
			unpack.on('error', reject);
			unpack.on('end', resolve);
			unpack.end(tarball);
		});
	}

	private cacheDir(versionId: string) {
		return path.join(this.instanceSettings.n8nFolder, 'apps', versionId);
	}

	private async isDir(dir: string) {
		return await stat(dir).then(
			(stats) => stats.isDirectory(),
			() => false,
		);
	}

	private async removeCacheDirs(versionIds: string[]) {
		await Promise.all(
			versionIds.map(async (id) => await rm(this.cacheDir(id), { recursive: true, force: true })),
		);
	}
}
