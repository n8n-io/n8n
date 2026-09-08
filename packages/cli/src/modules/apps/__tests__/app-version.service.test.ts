import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { gzipSync } from 'node:zlib';
import { Header } from 'tar';
import { mock } from 'vitest-mock-extended';

import type { AppVersionBlobStore } from '../app-version-blob-store';
import type { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import type { AppRepository } from '../app.repository';
import { AppBlobSizeQuotaExceededError } from '../errors/app-blob-size-quota-exceeded.error';
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
});
