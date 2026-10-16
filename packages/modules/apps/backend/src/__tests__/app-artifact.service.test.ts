import { Logger } from '@n8n/backend-common';
import { DbLockService, type OperationContext } from '@n8n/db';
import { BadRequestError, ConflictError, NotFoundError, UnexpectedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AppArtifact } from '../app-artifact.entity';
import { AppArtifactRepository } from '../app-artifact.repository';
import { AppArtifactService } from '../app-artifact.service';
import { AppsConfig } from '../apps.config';
import { AppBlobStore } from '../storage/app-blob-store';

function createService() {
	const ctx = mock<OperationContext>();
	const repository = mock<AppArtifactRepository>();
	const blobs = mock<AppBlobStore>();
	const locks = mock<DbLockService>();
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
	const artifact = mock<AppArtifact>({
		id: 1,
		storageKey: 'apps/artifacts/original.tgz',
		storedAt: 'fs',
		sizeBytes: 4,
		uploadStatus: 'pending',
		createdAt: new Date(),
	});
	repository.totalSize.mockResolvedValue(0);
	repository.reserve.mockResolvedValue(artifact);
	repository.findArtifact.mockResolvedValue(artifact);
	repository.findUnused.mockResolvedValue([]);
	repository.isReferenced.mockResolvedValue(false);
	blobs.newBlob.mockReturnValue({ storedAt: artifact.storedAt, storageKey: artifact.storageKey });
	const service = new AppArtifactService(
		repository,
		blobs,
		mock<AppsConfig>({ maxArtifactSizeBytes: 100, maxStorageBytes: 1000 }),
		locks,
		mock<Logger>(),
	);
	return { service, ctx, repository, blobs, artifact };
}

describe('AppArtifactService', () => {
	afterEach(() => vi.useRealTimers());

	it('rejects an oversized artifact before reserving storage', async () => {
		const { service, repository, blobs } = createService();

		await expect(service.upload(Buffer.alloc(101))).rejects.toThrow(BadRequestError);

		expect(repository.reserve).not.toHaveBeenCalled();
		expect(blobs.write).not.toHaveBeenCalled();
	});

	it('rejects an upload that would exceed the total quota', async () => {
		const { service, repository, blobs } = createService();
		repository.totalSize.mockResolvedValue(901);

		await expect(service.upload(Buffer.alloc(100))).rejects.toThrow(BadRequestError);

		expect(repository.reserve).not.toHaveBeenCalled();
		expect(blobs.write).not.toHaveBeenCalled();
	});

	it('accepts an upload at the artifact-size and total-quota limits', async () => {
		const { service, repository, artifact } = createService();
		repository.totalSize.mockResolvedValue(900);

		expect(await service.upload(Buffer.alloc(100))).toEqual(artifact);
	});

	it('discards an upload that expires while bytes are written', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const now = new Date('2026-01-01T00:00:00Z');
		vi.setSystemTime(now);
		const { service, blobs, artifact } = createService();
		blobs.write.mockImplementation(async () => {
			vi.setSystemTime(now.getTime() + 31 * 60 * 1000);
		});

		await expect(service.upload(Buffer.from('test'))).rejects.toThrow(ConflictError);

		expect(blobs.delete).toHaveBeenCalledWith(artifact);
	});

	it('rejects an upload that can no longer be completed', async () => {
		const { service, repository, artifact, ctx } = createService();
		repository.completeUpload.mockResolvedValue(false);

		await expect(service.completeUpload(artifact, ctx)).rejects.toThrow(ConflictError);
	});

	it('does not expose bytes from a pending upload', async () => {
		const { service, blobs, artifact } = createService();

		await expect(service.read(artifact.id)).rejects.toThrow(NotFoundError);

		expect(blobs.read).not.toHaveBeenCalled();
	});

	it('returns completed artifact bytes', async () => {
		const { service, blobs, artifact } = createService();
		artifact.uploadStatus = 'completed';
		const body = Buffer.from('test');
		blobs.read.mockResolvedValue(body);

		expect(await service.read(artifact.id)).toEqual(body);
	});

	it.each([
		{ body: null, error: NotFoundError, reason: 'missing' },
		{ body: Buffer.from('bad'), error: UnexpectedError, reason: 'the wrong size' },
	])('rejects completed content that is $reason', async ({ body, error }) => {
		const { service, blobs, artifact } = createService();
		artifact.uploadStatus = 'completed';
		blobs.read.mockResolvedValue(body);

		await expect(service.read(artifact.id)).rejects.toThrow(error);
	});

	it('rejects an oversized stored artifact before loading its bytes', async () => {
		const { service, blobs, artifact } = createService();
		artifact.uploadStatus = 'completed';
		artifact.sizeBytes = 101;

		await expect(service.read(artifact.id)).rejects.toThrow(BadRequestError);

		expect(blobs.read).not.toHaveBeenCalled();
	});

	it.each([
		{ operation: 'upload', reservation: 'missing' },
		{ operation: 'upload', reservation: 'reused' },
		{ operation: 'discard', reservation: 'missing' },
		{ operation: 'discard', reservation: 'reused' },
	])(
		'deletes the original blob after $operation with a $reservation reservation',
		async ({ operation, reservation }) => {
			const { service, ctx, repository, blobs, artifact } = createService();
			repository.findArtifact.mockResolvedValue(
				reservation === 'missing'
					? null
					: mock<AppArtifact>({ ...artifact, storageKey: 'apps/artifacts/replacement.tgz' }),
			);

			if (operation === 'upload') {
				const error = new Error('Write failed.');
				blobs.write.mockRejectedValue(error);
				await expect(service.upload(Buffer.from('test'))).rejects.toBe(error);
			} else {
				await service.discard(artifact);
			}

			expect(blobs.delete).toHaveBeenCalledExactlyOnceWith(artifact);
			expect(repository.removeUnused).toHaveBeenCalledExactlyOnceWith(artifact, ctx);
			expect(repository.isReferenced).not.toHaveBeenCalled();
		},
	);

	it.each(['missing', 'reused'])(
		'skips a scheduled cleanup candidate whose reservation is %s',
		async (reservation) => {
			const { service, repository, blobs, artifact } = createService();
			repository.findUnused.mockResolvedValueOnce([
				mock<AppArtifact>({ ...artifact, uploadStatus: 'completed' }),
			]);
			repository.findArtifact.mockResolvedValue(
				reservation === 'missing'
					? null
					: mock<AppArtifact>({ ...artifact, storageKey: 'apps/artifacts/replacement.tgz' }),
			);

			await service.cleanup();

			expect(blobs.delete).not.toHaveBeenCalled();
			expect(repository.removeUnused).not.toHaveBeenCalled();
		},
	);

	it('keeps an artifact that is still referenced when discard runs', async () => {
		const { service, repository, blobs, artifact } = createService();
		repository.isReferenced.mockResolvedValue(true);

		await service.discard(artifact);

		expect(blobs.delete).not.toHaveBeenCalled();
		expect(repository.removeUnused).not.toHaveBeenCalled();
	});

	it('keeps a pending upload that is still within its upload lifetime', async () => {
		const { service, repository, blobs, artifact } = createService();
		repository.findUnused.mockResolvedValueOnce([artifact]);

		await service.cleanup();

		expect(blobs.delete).not.toHaveBeenCalled();
		expect(repository.removeUnused).not.toHaveBeenCalled();
	});

	it('removes an expired pending upload', async () => {
		const { service, repository, blobs, artifact, ctx } = createService();
		artifact.createdAt = new Date(Date.now() - 31 * 60 * 1000);
		repository.findUnused.mockResolvedValueOnce([artifact]);

		await service.cleanup();

		expect(blobs.delete).toHaveBeenCalledWith(artifact);
		expect(repository.removeUnused).toHaveBeenCalledWith(artifact, ctx);
	});

	it('retains a failed deletion for retry and cleans the next artifact', async () => {
		const { service, repository, blobs, artifact, ctx } = createService();
		artifact.uploadStatus = 'completed';
		const next = mock<AppArtifact>({ ...artifact, id: 2, storageKey: 'apps/artifacts/next.tgz' });
		repository.findUnused.mockResolvedValueOnce([artifact, next]);
		repository.findArtifact.mockImplementation(async (id) =>
			id === artifact.id ? artifact : next,
		);
		blobs.delete.mockRejectedValueOnce(new Error('Storage is unavailable.'));

		await service.cleanup();

		expect(repository.removeUnused).toHaveBeenCalledExactlyOnceWith(next, ctx);
	});
});
