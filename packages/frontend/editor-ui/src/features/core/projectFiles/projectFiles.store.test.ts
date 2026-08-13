import type { ProjectFileListResponse, ProjectFileResponse } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import * as projectFilesApi from '@/features/core/projectFiles/projectFiles.api';
import { useProjectFilesStore } from '@/features/core/projectFiles/projectFiles.store';

function createFile(data: Partial<ProjectFileResponse> = {}): ProjectFileResponse {
	return {
		id: 'file-1',
		name: 'report.pdf',
		mimeType: 'application/pdf',
		fileSizeBytes: 1024,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		createdBy: null,
		updatedBy: null,
		...data,
	};
}

function createResponse(usage: ProjectFileListResponse['usage']): ProjectFileListResponse {
	return { count: 1, data: [createFile()], usage };
}

describe('projectFiles.store', () => {
	let store: ReturnType<typeof useProjectFilesStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useProjectFilesStore();
		vi.restoreAllMocks();
	});

	describe('fetchFiles', () => {
		it('stores files, count and usage from the response', async () => {
			vi.spyOn(projectFilesApi, 'fetchProjectFilesApi').mockResolvedValue(
				createResponse({ usedBytes: 1024, quotaBytes: 4096, scope: 'project' }),
			);

			await store.fetchFiles('project-1', { take: 10, skip: 0 });

			expect(store.files).toHaveLength(1);
			expect(store.totalCount).toBe(1);
			expect(store.usage).toEqual({ usedBytes: 1024, quotaBytes: 4096, scope: 'project' });
		});

		it('passes pagination and search through to the API', async () => {
			const spy = vi
				.spyOn(projectFilesApi, 'fetchProjectFilesApi')
				.mockResolvedValue(createResponse({ usedBytes: 0, quotaBytes: 100, scope: 'project' }));

			await store.fetchFiles('project-1', { take: 25, skip: 50, search: 'logo' });

			expect(spy).toHaveBeenCalledWith(expect.anything(), 'project-1', {
				take: 25,
				skip: 50,
				search: 'logo',
			});
		});
	});

	describe('quota state', () => {
		const withUsage = async (usedBytes: number, quotaBytes: number) => {
			vi.spyOn(projectFilesApi, 'fetchProjectFilesApi').mockResolvedValue(
				createResponse({ usedBytes, quotaBytes, scope: 'project' }),
			);
			await store.fetchFiles('project-1');
		};

		it('is neither near nor at quota well below the threshold', async () => {
			await withUsage(10, 100);

			expect(store.isNearQuota).toBe(false);
			expect(store.isAtQuota).toBe(false);
		});

		it('is near quota at the 80% threshold', async () => {
			await withUsage(80, 100);

			expect(store.isNearQuota).toBe(true);
			expect(store.isAtQuota).toBe(false);
		});

		it('is at quota, and no longer merely near it, when full', async () => {
			await withUsage(100, 100);

			expect(store.isNearQuota).toBe(false);
			expect(store.isAtQuota).toBe(true);
		});

		it('treats a zero quota as empty rather than dividing by zero', async () => {
			await withUsage(0, 0);

			expect(store.quotaFraction).toBe(0);
			expect(store.isAtQuota).toBe(false);
		});
	});

	describe('downloadFile', () => {
		it('navigates to the content URL instead of buffering the bytes', () => {
			const link = document.createElement('a');
			const clickSpy = vi.spyOn(link, 'click').mockImplementation(() => {});
			vi.spyOn(document, 'createElement').mockReturnValue(link);

			store.downloadFile('project-1', 'file-1');

			expect(link.href).toContain('/projects/project-1/files/file-1/content');
			expect(clickSpy).toHaveBeenCalled();
			// Removed again so repeated downloads don't accumulate nodes.
			expect(document.body.contains(link)).toBe(false);
		});
	});

	describe('uploadFile', () => {
		it('forwards the overwrite flag', async () => {
			const spy = vi.spyOn(projectFilesApi, 'uploadProjectFileApi').mockResolvedValue(createFile());
			const file = new File(['x'], 'a.txt', { type: 'text/plain' });

			await store.uploadFile('project-1', file, { overwrite: true });

			expect(spy).toHaveBeenCalledWith(expect.anything(), 'project-1', file, {
				overwrite: true,
			});
		});
	});
});
