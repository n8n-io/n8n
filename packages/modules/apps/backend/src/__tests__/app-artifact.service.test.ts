import { Logger } from '@n8n/backend-common';
import { DbLockService, type OperationContext } from '@n8n/db';
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
});
