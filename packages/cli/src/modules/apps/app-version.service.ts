import type { AppVersion as AppVersionResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { extract as extractTar, list as listTar } from 'tar';

import { AppVersionBlobStore, type StoredAppVersionBlob } from './app-version-blob-store';
import type { AppVersion } from './app-version.entity';
import { AppVersionRepository } from './app-version.repository';
import { AppRepository } from './app.repository';
import { AppNotFoundError } from './errors/app-not-found.error';
import { InvalidAppVersionTarballError } from './errors/invalid-app-version-tarball.error';
import { createDistTarFilter } from './serving/dist-tar-filter';

export const MAX_TARBALL_BYTES = 20 * 1024 * 1024;

/**
 * The newest five dist tarballs of an app are kept; the active version's dist is
 * always kept. Older versions keep their source only.
 */
const DIST_RETENTION = 5;

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
	) {}

	async create(appId: string, source: Buffer, dist: Buffer): Promise<AppVersion> {
		await this.assertTarball('source', source);
		await this.assertTarball('dist', dist, createDistTarFilter());
		if (!(await this.appRepository.existsBy({ id: appId }))) throw new AppNotFoundError(appId);

		const versionId = generateNanoId();
		const sourceBlob = await this.blobStore.write({ appId, versionId, kind: 'source' }, source);
		const distBlob = await this.blobStore.write({ appId, versionId, kind: 'dist' }, dist);

		const version = await this.appVersionRepository
			.insertVersion({
				id: versionId,
				appId,
				storedAt: sourceBlob.storedAt,
				sourceStorageKey: sourceBlob.storageKey,
				distStorageKey: distBlob.storageKey,
			})
			.catch(async (error: unknown) => {
				await this.blobStore.delete([sourceBlob, distBlob]);
				throw error;
			});

		await this.appRepository.setActiveVersionId(appId, versionId);
		await this.pruneDist(appId, versionId);

		return version;
	}

	async list(appId: string): Promise<AppVersion[]> {
		return await this.appVersionRepository.listByAppId(appId);
	}

	toResponse(version: AppVersion): AppVersionResponse {
		return {
			id: version.id,
			appId: version.appId,
			createdAt: version.createdAt.toISOString(),
			hasDist: version.distStorageKey !== null,
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

	private async assertTarball(
		kind: 'source' | 'dist',
		body: Buffer,
		filter?: ReturnType<typeof createDistTarFilter>,
	): Promise<void> {
		if (body.length > MAX_TARBALL_BYTES) {
			throw new InvalidAppVersionTarballError(kind, `larger than ${MAX_TARBALL_BYTES} bytes`);
		}
		if (body.length < 2 || !body.subarray(0, 2).equals(GZIP_MAGIC)) {
			throw new InvalidAppVersionTarballError(kind, 'not a gzip file');
		}
		// `strict` turns malformed headers, truncation and gunzip failures into errors.
		const parser = listTar({ strict: true, filter });
		await new Promise<void>((resolve, reject) => {
			parser.on('error', reject);
			parser.on('end', resolve);
			parser.end(body);
		}).catch((error: unknown) => {
			const reason = error instanceof Error ? error.message : String(error);
			throw new InvalidAppVersionTarballError(kind, `not a tar archive (${reason})`);
		});
	}

	private async extract(tarball: Buffer, cwd: string): Promise<void> {
		const unpack = extractTar({ cwd, strip: 0, filter: createDistTarFilter() });
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
