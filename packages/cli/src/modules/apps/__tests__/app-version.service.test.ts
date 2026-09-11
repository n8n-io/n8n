import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { gzipSync } from 'node:zlib';
import { Header } from 'tar';
import { mock } from 'vitest-mock-extended';

import type { AppVersionBlobStore } from '../app-version-blob-store';
import type { AppVersion } from '../app-version.entity';
import type { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import { AppBlobSizeQuotaExceededError } from '../errors/app-blob-size-quota-exceeded.error';
import { AppVersionNotPublishableError } from '../errors/app-version-not-publishable.error';
import { AppVersionQuotaExceededError } from '../errors/app-version-quota-exceeded.error';
import { InvalidAppVersionTarballError } from '../errors/invalid-app-version-tarball.error';

const tgz = (files: Record<string, string>) => {
	const blocks = Object.entries(files).map(([path, text]) => {
		const content = Buffer.from(text);
		const header = new Header({ path, type: 'File', size: content.length, mtime: new Date(0) });
		header.encode();
		const data = Buffer.alloc(Math.ceil(content.length / 512) * 512);
		content.copy(data);
		return Buffer.concat([header.block!, data]);
	});
	return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
};

const source = tgz({ './src/main.ts': 'export {};' });
const dist = tgz({ './index.html': '<!doctype html>', './assets/app.js': ';' });

describe('AppVersionService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let blobStore: ReturnType<typeof mock<AppVersionBlobStore>>;
	let globalConfig: GlobalConfig;
	let service: AppVersionService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		appVersionRepository = mock<AppVersionRepository>();
		blobStore = mock<AppVersionBlobStore>();
		globalConfig = mock<GlobalConfig>({
			apps: {
				maxVersionsPerApp: 50,
				maxProjectBlobSize: 500 * 1024 * 1024,
			},
		});
		service = new AppVersionService(
			appRepository,
			appVersionRepository,
			blobStore,
			mock<InstanceSettings>({ n8nFolder: '/tmp/n8n' }),
			globalConfig,
		);
		appVersionRepository.countByAppId.mockResolvedValue(0);
		appVersionRepository.sumSizeByProjectId.mockResolvedValue(0);
		appVersionRepository.findDistPrunable.mockResolvedValue([]);
	});

	describe('create', () => {
		it('deletes the source blob when the dist blob write fails', async () => {
			const sourceBlob = { storedAt: 'db' as const, storageKey: 'source-key' };
			blobStore.write
				.mockResolvedValueOnce(sourceBlob)
				.mockRejectedValueOnce(new Error('disk full'));

			await expect(service.create('app-1', 'project-1', source, dist)).rejects.toThrow('disk full');

			expect(blobStore.delete).toHaveBeenCalledWith([sourceBlob]);
			expect(appVersionRepository.insertVersion).not.toHaveBeenCalled();
		});

		it('deletes both blobs when the version insert fails', async () => {
			const sourceBlob = { storedAt: 'db' as const, storageKey: 'source-key' };
			const distBlob = { storedAt: 'db' as const, storageKey: 'dist-key' };
			blobStore.write.mockResolvedValueOnce(sourceBlob).mockResolvedValueOnce(distBlob);
			appVersionRepository.insertVersion.mockRejectedValue(new Error('constraint'));

			await expect(service.create('app-1', 'project-1', source, dist)).rejects.toThrow(
				'constraint',
			);

			expect(blobStore.delete).toHaveBeenCalledWith([sourceBlob, distBlob]);
		});

		it('rejects a dist without index.html at its root', async () => {
			const noIndex = tgz({ './assets/app.js': ';', './nested/index.html': '' });

			await expect(service.create('app-1', 'project-1', source, noIndex)).rejects.toThrow(
				InvalidAppVersionTarballError,
			);

			expect(blobStore.write).not.toHaveBeenCalled();
		});

		it('makes the new version active and prunes old dists', async () => {
			blobStore.write
				.mockResolvedValueOnce({ storedAt: 'db', storageKey: 'source-key' })
				.mockResolvedValueOnce({ storedAt: 'db', storageKey: 'dist-key' });
			appVersionRepository.insertVersion.mockImplementation(
				async (version) => await Promise.resolve(version as AppVersion),
			);
			appVersionRepository.findDistPrunable.mockResolvedValue([]);

			const version = await service.create('app-1', 'project-1', source, dist);

			expect(appRepository.setActiveVersionId).toHaveBeenCalledWith('app-1', version.id);
			expect(appVersionRepository.findDistPrunable).toHaveBeenCalledWith('app-1', 5, version.id);
		});

		it('rejects a tarball that unpacks past the size budget', async () => {
			const MB = 1024 * 1024;
			const header = new Header({
				path: './big',
				type: 'File',
				size: 201 * MB,
				mtime: new Date(0),
			});
			header.encode();
			// Concatenated gzip members keep the fixture small; gunzip reads them as one stream.
			const bomb = Buffer.concat([
				gzipSync(header.block!),
				...Array<Buffer>(201).fill(gzipSync(Buffer.alloc(MB))),
				gzipSync(Buffer.alloc(1024)),
			]);

			await expect(service.create('app-1', 'project-1', bomb, dist)).rejects.toThrow(
				/Invalid source tarball: unpacks to more than/,
			);

			expect(blobStore.write).not.toHaveBeenCalled();
		});

		it('persists sourceSizeBytes/distSizeBytes equal to the tarball buffer lengths', async () => {
			const sourceBlob = { storedAt: 'db' as const, storageKey: 'source-key' };
			const distBlob = { storedAt: 'db' as const, storageKey: 'dist-key' };
			blobStore.write.mockResolvedValueOnce(sourceBlob).mockResolvedValueOnce(distBlob);

			await service.create('app-1', 'project-1', source, dist);

			expect(appVersionRepository.insertVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					sourceSizeBytes: source.length,
					distSizeBytes: dist.length,
				}),
			);
		});

		it('throws AppVersionQuotaExceededError when the app already has maxVersionsPerApp versions, without writing any blob', async () => {
			appVersionRepository.countByAppId.mockResolvedValue(50);

			await expect(service.create('app-1', 'project-1', source, dist)).rejects.toThrow(
				AppVersionQuotaExceededError,
			);

			expect(blobStore.write).not.toHaveBeenCalled();
		});

		it('throws AppBlobSizeQuotaExceededError when existing project usage plus the new tarballs would exceed maxProjectBlobSize', async () => {
			appVersionRepository.sumSizeByProjectId.mockResolvedValue(
				globalConfig.apps.maxProjectBlobSize - source.length, // one byte under, dist pushes it over
			);

			await expect(service.create('app-1', 'project-1', source, dist)).rejects.toThrow(
				AppBlobSizeQuotaExceededError,
			);

			expect(blobStore.write).not.toHaveBeenCalled();
		});

		it('checks quotas before parsing the tarball, rejecting for the quota reason even when the tarball itself is invalid', async () => {
			appVersionRepository.countByAppId.mockResolvedValue(50);
			const garbage = Buffer.from('not a tarball at all');

			await expect(service.create('app-1', 'project-1', garbage, garbage)).rejects.toThrow(
				AppVersionQuotaExceededError,
			);
		});
	});

	describe('readRouterSource', () => {
		const app = { id: 'app-1', activeVersionId: 'v1' } as App;
		const version = {
			id: 'v1',
			appId: 'app-1',
			storedAt: 'db' as const,
			sourceStorageKey: 'src-key',
			distStorageKey: null,
		} as AppVersion;

		it("returns the newest version's src/router.ts", async () => {
			appVersionRepository.listByAppId.mockResolvedValue([version]);
			blobStore.readAsBuffer.mockResolvedValue(
				tgz({ './src/router.ts': 'export const router = createRouter({ routes: [] });' }),
			);

			const result = await service.readRouterSource(app);

			expect(result).toContain('createRouter');
		});

		it('returns null when the app has no version yet', async () => {
			appVersionRepository.listByAppId.mockResolvedValue([]);

			expect(
				await service.readRouterSource({ id: 'app-1', activeVersionId: null } as App),
			).toBeNull();
		});

		it('returns null when the source has no src/router.ts', async () => {
			appVersionRepository.listByAppId.mockResolvedValue([version]);
			blobStore.readAsBuffer.mockResolvedValue(tgz({ './package.json': '{}' }));

			expect(await service.readRouterSource(app)).toBeNull();
		});
	});

	describe('createSourceSnapshot', () => {
		const versionRow = (id: string, distStorageKey: string | null = null): AppVersion =>
			({
				id,
				appId: 'app-1',
				storedAt: 'db',
				sourceStorageKey: `src-${id}`,
				distStorageKey,
				createdAt: new Date(0),
			}) as AppVersion;

		beforeEach(() => {
			appRepository.findOneBy.mockResolvedValue({
				id: 'app-1',
				projectId: 'project-1',
				activeVersionId: 'v-active',
			} as App);
			blobStore.write.mockResolvedValue({ storedAt: 'db', storageKey: 'snap-key' });
			appVersionRepository.insertVersion.mockImplementation(
				async (version) => await Promise.resolve(version as AppVersion),
			);
			appVersionRepository.findSourceOnlyPrunable.mockResolvedValue([]);
		});

		it('stores a source-only version without changing the active version or pruning dists', async () => {
			const version = await service.createSourceSnapshot('app-1', source);

			expect(blobStore.write).toHaveBeenCalledTimes(1);
			expect(blobStore.write).toHaveBeenCalledWith(
				{ appId: 'app-1', versionId: version.id, kind: 'source' },
				source,
			);
			expect(version.distStorageKey).toBeNull();
			expect(version.sourceStorageKey).toBe('snap-key');
			expect(appRepository.setActiveVersionId).not.toHaveBeenCalled();
			expect(appVersionRepository.findDistPrunable).not.toHaveBeenCalled();
		});

		it('keeps twenty source-only snapshots and deletes the older ones, never the active version', async () => {
			appVersionRepository.findSourceOnlyPrunable.mockResolvedValue([
				versionRow('old-1'),
				versionRow('old-2'),
			]);

			await service.createSourceSnapshot('app-1', source);

			expect(appVersionRepository.findSourceOnlyPrunable).toHaveBeenCalledWith(
				'app-1',
				20,
				'v-active',
			);
			expect(blobStore.delete).toHaveBeenCalledWith([
				{ storedAt: 'db', storageKey: 'src-old-1' },
				{ storedAt: 'db', storageKey: 'src-old-2' },
			]);
			expect(appVersionRepository.deleteByIds).toHaveBeenCalledWith(['old-1', 'old-2']);
		});

		it('records the source size and no dist size', async () => {
			await service.createSourceSnapshot('app-1', source);

			expect(appVersionRepository.insertVersion).toHaveBeenCalledWith(
				expect.objectContaining({ sourceSizeBytes: source.length, distSizeBytes: null }),
			);
		});

		it('counts against the version and project size quotas like a publish', async () => {
			appVersionRepository.countByAppId.mockResolvedValue(50);

			await expect(service.createSourceSnapshot('app-1', source)).rejects.toThrow(
				AppVersionQuotaExceededError,
			);

			appVersionRepository.countByAppId.mockResolvedValue(0);
			appVersionRepository.sumSizeByProjectId.mockResolvedValue(
				globalConfig.apps.maxProjectBlobSize - source.length + 1,
			);

			await expect(service.createSourceSnapshot('app-1', source)).rejects.toThrow(
				AppBlobSizeQuotaExceededError,
			);

			expect(appVersionRepository.sumSizeByProjectId).toHaveBeenCalledWith('project-1');
			expect(blobStore.write).not.toHaveBeenCalled();
		});

		it('deletes the blob when the row insert fails', async () => {
			appVersionRepository.insertVersion.mockRejectedValue(new Error('constraint'));

			await expect(service.createSourceSnapshot('app-1', source)).rejects.toThrow('constraint');

			expect(blobStore.delete).toHaveBeenCalledWith([{ storedAt: 'db', storageKey: 'snap-key' }]);
		});

		it('rejects a non-gzip body before touching storage', async () => {
			await expect(service.createSourceSnapshot('app-1', Buffer.from('nope'))).rejects.toThrow(
				InvalidAppVersionTarballError,
			);

			expect(blobStore.write).not.toHaveBeenCalled();
		});
	});

	describe('readSource', () => {
		it('reads the newest version even when an older one is active', async () => {
			const newest: AppVersion = {
				id: 'snap-9',
				appId: 'app-1',
				storedAt: 'db',
				sourceStorageKey: 'src-snap-9',
				distStorageKey: null,
				createdAt: new Date(9),
			} as AppVersion;
			appVersionRepository.listByAppId.mockResolvedValue([newest]);
			blobStore.readAsBuffer.mockResolvedValue(Buffer.from('tar'));

			const result = await service.readSource({ id: 'app-1', activeVersionId: 'v-active' } as App);

			expect(appVersionRepository.findById).not.toHaveBeenCalled();
			expect(blobStore.readAsBuffer).toHaveBeenCalledWith({
				storedAt: 'db',
				storageKey: 'src-snap-9',
			});
			expect(result).toEqual({ versionId: 'snap-9', data: Buffer.from('tar') });
		});

		it('returns null for an app without versions', async () => {
			appVersionRepository.listByAppId.mockResolvedValue([]);

			expect(await service.readSource({ id: 'app-1', activeVersionId: null } as App)).toBeNull();
		});
	});

	describe('setActiveVersion', () => {
		const app = { id: 'app-1', activeVersionId: 'v-1' } as App;
		const built = { id: 'v-2', appId: 'app-1', distStorageKey: 'dist-key' } as AppVersion;

		it('serves a built version of the app', async () => {
			appVersionRepository.findById.mockResolvedValue(built);

			await service.setActiveVersion(app, 'v-2');

			expect(appRepository.setActiveVersionId).toHaveBeenCalledWith('app-1', 'v-2');
		});

		it('unpublishes with null without looking a version up', async () => {
			await service.setActiveVersion(app, null);

			expect(appVersionRepository.findById).not.toHaveBeenCalled();
			expect(appRepository.setActiveVersionId).toHaveBeenCalledWith('app-1', null);
		});

		it.each([
			{ name: 'an unknown version', version: null, reason: 'does not belong' },
			{
				name: "another app's version",
				version: { ...built, appId: 'app-2' },
				reason: 'does not belong',
			},
			{
				name: 'a source-only snapshot',
				version: { ...built, distStorageKey: null },
				reason: 'no build',
			},
		])('rejects $name', async ({ version, reason }) => {
			appVersionRepository.findById.mockResolvedValue(version as AppVersion | null);

			const attempt = service.setActiveVersion(app, 'v-2');

			await expect(attempt).rejects.toThrow(AppVersionNotPublishableError);
			await expect(attempt).rejects.toThrow(reason);
			expect(appRepository.setActiveVersionId).not.toHaveBeenCalled();
		});
	});

	describe('toResponse', () => {
		const row = (distStorageKey: string | null) =>
			({ id: 'v-1', appId: 'app-1', createdAt: new Date(0), distStorageKey }) as AppVersion;

		it('marks a built, served version as an active publish', () => {
			expect(service.toResponse(row('dist-key'), 'v-1')).toEqual({
				id: 'v-1',
				appId: 'app-1',
				createdAt: '1970-01-01T00:00:00.000Z',
				hasDist: true,
				isActive: true,
				kind: 'publish',
			});
		});

		it('marks a source-only version as an inactive snapshot', () => {
			expect(service.toResponse(row(null), 'v-9')).toMatchObject({
				hasDist: false,
				isActive: false,
				kind: 'snapshot',
			});
		});
	});

	describe('hasUnpublishedChanges', () => {
		const row = (id: string, createdAt: number) =>
			({ id, createdAt: new Date(createdAt) }) as AppVersion;

		it.each([
			{ name: 'no versions', versions: [], activeVersionId: null, expected: false },
			{
				name: 'a snapshot but nothing published',
				versions: [row('s-1', 5)],
				activeVersionId: null,
				expected: true,
			},
			{
				name: 'the newest version is the published one',
				versions: [row('v-2', 9), row('s-1', 5)],
				activeVersionId: 'v-2',
				expected: false,
			},
			{
				name: 'a snapshot newer than the published version',
				versions: [row('s-3', 12), row('v-2', 9)],
				activeVersionId: 'v-2',
				expected: true,
			},
		])('is $expected with $name', async ({ versions, activeVersionId, expected }) => {
			appVersionRepository.listByAppId.mockResolvedValue(versions);

			expect(await service.hasUnpublishedChanges({ id: 'app-1', activeVersionId } as App)).toBe(
				expected,
			);
		});
	});
});
