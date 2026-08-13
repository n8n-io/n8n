import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Buffer } from 'node:buffer';
import { mock } from 'vitest-mock-extended';

import type { FileStorageSizeValidator } from '../file-storage-size-validator.service';
import { ProjectFileService } from '../file-storage.service';
import type { ProjectFileStore } from '../project-file-store';
import type { ProjectFile } from '../project-file.entity';
import type { ProjectFileRepository } from '../project-file.repository';
import type { ProjectFilesSnapshotService } from '../project-files-snapshot.service';

/**
 * The `$files` snapshot cache must be dropped after every mutation, so runs
 * and previews never resolve names against stale metadata for the whole TTL.
 */
describe('ProjectFileService snapshot invalidation', () => {
	const repository = mock<ProjectFileRepository>();
	const store = mock<ProjectFileStore>();
	const sizeValidator = mock<FileStorageSizeValidator>();
	const globalConfig = mockInstance(GlobalConfig, {
		fileStorage: {
			maxSize: 1024 * 1024 * 1024,
			maxFileSize: 50 * 1024 * 1024,
		},
	});
	const logger = mock<Logger>();
	const snapshotService = mock<ProjectFilesSnapshotService>();

	let service: ProjectFileService;

	const projectId = 'project-1';
	const file = {
		id: 'file-1',
		projectId,
		name: 'pricing.csv',
		storedAt: 'db',
		storageKey: 'key-1',
		mimeType: 'text/csv',
		fileSizeBytes: 3,
		createdAt: new Date('2026-08-01T00:00:00.000Z'),
		updatedAt: new Date('2026-08-01T00:00:00.000Z'),
	} as ProjectFile;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		service = new ProjectFileService(
			repository,
			store,
			sizeValidator,
			globalConfig,
			logger,
			snapshotService,
		);

		sizeValidator.validateSize.mockResolvedValue(undefined);
		repository.getTotalSizeBytes.mockResolvedValue({ totalBytes: 3 });
		store.write.mockResolvedValue({ storedAt: 'db', storageKey: 'key-2', bytesWritten: 3 });
		store.delete.mockResolvedValue(undefined);
		snapshotService.invalidateSnapshot.mockResolvedValue(undefined);
	});

	it('should invalidate after uploading a new file', async () => {
		repository.findByNameInProject.mockResolvedValue(null);
		repository.insertFile.mockResolvedValue(file);

		await service.upload(
			projectId,
			Buffer.from('abc'),
			{ name: 'pricing.csv', mimeType: 'text/csv' },
			'error',
		);

		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith(projectId);
	});

	it('should invalidate after replacing content', async () => {
		await service.replaceContent(file, Buffer.from('abc'), 'text/csv');

		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith(projectId);
	});

	it('should invalidate after a rename', async () => {
		repository.findByIdInProject.mockResolvedValue(file);
		repository.findByNameInProject.mockResolvedValue(null);

		await service.renameFile(file.id, projectId, 'rates.csv');

		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith(projectId);
	});

	it('should invalidate after deleting files', async () => {
		await service.deleteFiles([file.id], projectId);

		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith(projectId);
	});

	it('should invalidate after deleting all files of a project', async () => {
		repository.findAllByProjectId.mockResolvedValue([file]);

		await service.deleteAllByProjectId(projectId);

		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith(projectId);
	});

	it('should invalidate both projects on a transfer', async () => {
		await service.transferAllToProject(projectId, 'project-2');

		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith(projectId);
		expect(snapshotService.invalidateSnapshot).toHaveBeenCalledWith('project-2');
	});

	it('should never fail the mutation when invalidation fails', async () => {
		snapshotService.invalidateSnapshot.mockRejectedValue(new Error('cache down'));

		await expect(service.deleteFiles([file.id], projectId)).resolves.toBeUndefined();
	});
});
