import type { ProjectFilesSnapshotEntry } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import type { ProjectFile } from '../project-file.entity';
import type { ProjectFileRepository } from '../project-file.repository';
import { ProjectFilesSnapshotService } from '../project-files-snapshot.service';

describe('ProjectFilesSnapshotService', () => {
	const repository = mock<ProjectFileRepository>();
	const cacheService = mock<CacheService>();
	let service: ProjectFilesSnapshotService;

	const projectId = 'project-1';
	const cacheKey = `project-files:snapshot:${projectId}`;

	const row = {
		id: 'file-1',
		name: 'pricing.csv',
		mimeType: 'text/csv',
		fileSizeBytes: 42,
		updatedAt: new Date('2026-08-01T12:00:00.000Z'),
	} as ProjectFile;

	const snapshotEntry: ProjectFilesSnapshotEntry = {
		id: 'file-1',
		name: 'pricing.csv',
		mimeType: 'text/csv',
		size: 42,
		updatedAt: '2026-08-01T12:00:00.000Z',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ProjectFilesSnapshotService(repository, cacheService);
	});

	describe('getSnapshot', () => {
		it('should query the repository and cache the mapped snapshot on a miss', async () => {
			cacheService.get.mockResolvedValue(undefined);
			repository.findAllByProjectId.mockResolvedValue([row]);

			const snapshot = await service.getSnapshot(projectId);

			expect(snapshot).toEqual([snapshotEntry]);
			expect(repository.findAllByProjectId).toHaveBeenCalledWith(projectId);
			expect(cacheService.set).toHaveBeenCalledWith(cacheKey, [snapshotEntry], expect.any(Number));
		});

		it('should serve from the cache without touching the repository on a hit', async () => {
			cacheService.get.mockResolvedValue([snapshotEntry]);

			const snapshot = await service.getSnapshot(projectId);

			expect(snapshot).toEqual([snapshotEntry]);
			expect(repository.findAllByProjectId).not.toHaveBeenCalled();
			expect(cacheService.set).not.toHaveBeenCalled();
		});

		it('should cache empty snapshots too', async () => {
			cacheService.get.mockResolvedValue(undefined);
			repository.findAllByProjectId.mockResolvedValue([]);

			const snapshot = await service.getSnapshot(projectId);

			expect(snapshot).toEqual([]);
			expect(cacheService.set).toHaveBeenCalledWith(cacheKey, [], expect.any(Number));
		});
	});

	describe('invalidateSnapshot', () => {
		it('should drop the cached snapshot for the project', async () => {
			await service.invalidateSnapshot(projectId);

			expect(cacheService.delete).toHaveBeenCalledWith(cacheKey);
		});
	});
});
