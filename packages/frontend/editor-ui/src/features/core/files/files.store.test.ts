import { createPinia, setActivePinia } from 'pinia';
import { useFilesStore } from '@/features/core/files/files.store';
import * as filesApi from '@/features/core/files/files.api';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import type { ProjectFile } from '@/features/core/files/files.types';
import type { RequestOptions } from '@n8n/rest-api-client';

vi.mock('@/features/collaboration/projects/projects.store');
vi.mock('@n8n/stores/settings.store');
vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => true) }));
vi.mock('@/features/core/files/files.api');

const MB = 1024 * 1024;

function createFile(data: Partial<ProjectFile> = {}): ProjectFile {
	return {
		id: 'file-1',
		name: 'test.csv',
		mimeType: 'text/csv',
		sizeBytes: 1024,
		projectId: 'project-1',
		createdAt: '2021-01-01',
		updatedAt: '2021-01-01',
		...data,
	};
}

function mockSettings(maxFileSize = 50 * MB) {
	vi.mocked(useSettingsStore).mockReturnValue({
		settings: {
			fileStorage: {
				maxSize: 1024 * MB,
				maxFileSize,
			},
		},
	} as ReturnType<typeof useSettingsStore>);
}

describe('files.store', () => {
	let filesStore: ReturnType<typeof useFilesStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		mockSettings();

		vi.mocked(useProjectsStore).mockReturnValue({
			currentProject: undefined,
			personalProject: undefined,
		} as unknown as ReturnType<typeof useProjectsStore>);

		vi.mocked(filesApi.fetchFileStorageLimitsApi).mockResolvedValue({
			totalBytes: 0,
			maxBytes: 1024 * MB,
			quotaStatus: 'ok',
		});

		filesStore = useFilesStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchFiles', () => {
		it('should fetch files and update state', async () => {
			const response = { count: 2, data: [createFile(), createFile({ id: 'file-2' })] };
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue(response);

			await filesStore.fetchFiles('project-1', 2, 10, { name: 'test' }, 'name:asc');

			expect(filesApi.fetchFilesApi).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				{ skip: 10, take: 10 },
				{ name: 'test' },
				'name:asc',
			);
			expect(filesStore.files).toEqual(response.data);
			expect(filesStore.totalCount).toBe(2);
		});
	});

	describe('fetchLimits', () => {
		it('should update usage state and push the error banner when the quota is exceeded', async () => {
			const bannersStore = useBannersStore();
			vi.mocked(filesApi.fetchFileStorageLimitsApi).mockResolvedValue({
				totalBytes: 1024 * MB,
				maxBytes: 1024 * MB,
				quotaStatus: 'error',
			});

			await filesStore.fetchLimits();

			expect(filesStore.usedBytes).toBe(1024 * MB);
			expect(filesStore.maxBytes).toBe(1024 * MB);
			expect(filesStore.quotaStatus).toBe('error');
			expect(bannersStore.bannerStack).toContain('FILE_STORAGE_LIMIT_ERROR');
			expect(bannersStore.bannerStack).not.toContain('FILE_STORAGE_LIMIT_WARNING');
		});

		it('should swap the error banner for the warning banner and remove both when ok', async () => {
			const bannersStore = useBannersStore();

			vi.mocked(filesApi.fetchFileStorageLimitsApi).mockResolvedValue({
				totalBytes: 900 * MB,
				maxBytes: 1024 * MB,
				quotaStatus: 'warn',
			});
			await filesStore.fetchLimits();
			expect(bannersStore.bannerStack).toContain('FILE_STORAGE_LIMIT_WARNING');

			vi.mocked(filesApi.fetchFileStorageLimitsApi).mockResolvedValue({
				totalBytes: 1 * MB,
				maxBytes: 1024 * MB,
				quotaStatus: 'ok',
			});
			await filesStore.fetchLimits();
			expect(bannersStore.bannerStack).not.toContain('FILE_STORAGE_LIMIT_WARNING');
			expect(bannersStore.bannerStack).not.toContain('FILE_STORAGE_LIMIT_ERROR');
		});
	});

	describe('upload queue', () => {
		const makeUpload = (name = 'test.csv', size = 1024) =>
			new File([new ArrayBuffer(size)], name, { type: 'text/csv' });

		it('should mark oversized files as errors without uploading them', async () => {
			setActivePinia(createPinia());
			mockSettings(1 * MB);
			filesStore = useFilesStore();

			filesStore.enqueueUploads([makeUpload('big.csv', 2 * MB)], 'project-1', 'button');

			expect(filesStore.uploadQueue).toHaveLength(1);
			expect(filesStore.uploadQueue[0].status).toBe('error');
			expect(filesStore.uploadQueue[0].errorMessage).toBe('tooLarge');
			expect(filesApi.uploadFileApi).not.toHaveBeenCalled();
		});

		it('should upload files without conflicts and report progress', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({ count: 0, data: [] });
			vi.mocked(filesApi.uploadFileApi).mockImplementation(
				async (_ctx, _projectId, _file, _conflict, options?: RequestOptions) => {
					options?.onUploadProgress?.({ loaded: 50, total: 100 } as Parameters<
						NonNullable<RequestOptions['onUploadProgress']>
					>[0]);
					return createFile();
				},
			);

			filesStore.enqueueUploads([makeUpload()], 'project-1', 'button');

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('done'));
			expect(filesStore.uploadQueue[0].progress).toBe(100);
			expect(filesApi.uploadFileApi).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				expect.any(File),
				'error',
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
			expect(filesStore.uploadsCompletedCount).toBe(1);
		});

		it('should flag exact-name conflicts during pre-flight and not upload', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 1,
				data: [createFile({ name: 'test.csv' })],
			});

			filesStore.enqueueUploads([makeUpload('test.csv')], 'project-1', 'drop');

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('conflict'));
			expect(filesApi.uploadFileApi).not.toHaveBeenCalled();
			expect(filesStore.conflictedUploads).toHaveLength(1);
		});

		it('should not flag a contains-match with a different exact name as a conflict', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 1,
				data: [createFile({ name: 'other-test.csv' })],
			});
			vi.mocked(filesApi.uploadFileApi).mockResolvedValue(createFile());

			filesStore.enqueueUploads([makeUpload('test.csv')], 'project-1', 'button');

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('done'));
		});

		it('should resolve a conflict by replacing', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 1,
				data: [createFile({ name: 'test.csv' })],
			});
			vi.mocked(filesApi.uploadFileApi).mockResolvedValue(createFile());

			filesStore.enqueueUploads([makeUpload('test.csv')], 'project-1', 'button');
			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('conflict'));

			filesStore.resolveConflict(filesStore.uploadQueue[0].id, 'replace');

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('done'));
			expect(filesApi.uploadFileApi).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				expect.any(File),
				'replace',
				expect.anything(),
			);
		});

		it('should resolve a conflict by canceling', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 1,
				data: [createFile({ name: 'test.csv' })],
			});

			filesStore.enqueueUploads([makeUpload('test.csv')], 'project-1', 'button');
			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('conflict'));

			filesStore.resolveConflict(filesStore.uploadQueue[0].id, 'cancel');

			expect(filesStore.uploadQueue[0].status).toBe('canceled');
			expect(filesApi.uploadFileApi).not.toHaveBeenCalled();
		});

		it('should apply a resolution to all queued conflicts', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockImplementation(
				async (_ctx, _projectId, _options, filter) => ({
					count: 1,
					data: [createFile({ name: String(filter?.name) })],
				}),
			);
			vi.mocked(filesApi.uploadFileApi).mockResolvedValue(createFile());

			filesStore.enqueueUploads([makeUpload('a.csv'), makeUpload('b.csv')], 'project-1', 'button');
			await vi.waitFor(() => expect(filesStore.conflictedUploads).toHaveLength(2));

			filesStore.resolveConflict(filesStore.uploadQueue[0].id, 'keepBoth', true);

			await vi.waitFor(() =>
				expect(filesStore.uploadQueue.every((item) => item.status === 'done')).toBe(true),
			);
			expect(filesApi.uploadFileApi).toHaveBeenCalledTimes(2);
			expect(filesApi.uploadFileApi).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				expect.any(File),
				'keepBoth',
				expect.anything(),
			);
		});

		it('should mark an upload as conflicted when the server responds with 409', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({ count: 0, data: [] });
			const conflictError = new Error('conflict') as Error & { httpStatusCode: number };
			conflictError.httpStatusCode = 409;
			vi.mocked(filesApi.uploadFileApi).mockRejectedValue(conflictError);

			filesStore.enqueueUploads([makeUpload()], 'project-1', 'button');

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('conflict'));
		});

		it('should keep a failed upload in the queue with the server message and allow retrying', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({ count: 0, data: [] });
			vi.mocked(filesApi.uploadFileApi).mockRejectedValueOnce(new Error('Quota exceeded'));

			filesStore.enqueueUploads([makeUpload()], 'project-1', 'button');

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('error'));
			expect(filesStore.uploadQueue[0].errorMessage).toBe('Quota exceeded');

			vi.mocked(filesApi.uploadFileApi).mockResolvedValueOnce(createFile());
			filesStore.retryUpload(filesStore.uploadQueue[0].id);

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('done'));
		});

		it('should cancel an in-flight upload via its abort signal', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({ count: 0, data: [] });
			vi.mocked(filesApi.uploadFileApi).mockImplementation(
				async (_ctx, _projectId, _file, _conflict, options?: RequestOptions) =>
					await new Promise((_resolve, reject) => {
						options?.signal?.addEventListener('abort', () => {
							const error = new Error('canceled');
							error.name = 'CanceledError';
							reject(error);
						});
					}),
			);

			filesStore.enqueueUploads([makeUpload()], 'project-1', 'button');
			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('uploading'));

			filesStore.cancelUpload(filesStore.uploadQueue[0].id);

			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('canceled'));
		});

		it('should drop finished uploads from the queue when a new batch is enqueued', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({ count: 0, data: [] });
			vi.mocked(filesApi.uploadFileApi).mockResolvedValue(createFile());

			filesStore.enqueueUploads([makeUpload('first.csv')], 'project-1', 'button');
			await vi.waitFor(() => expect(filesStore.uploadQueue[0].status).toBe('done'));

			filesStore.enqueueUploads([makeUpload('second.csv')], 'project-1', 'button');

			expect(filesStore.uploadQueue.every((item) => item.name === 'second.csv')).toBe(true);
		});
	});

	describe('renameFile', () => {
		it('should rename the file and update local state', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({ count: 1, data: [createFile()] });
			await filesStore.fetchFiles('project-1', 1, 10);

			vi.mocked(filesApi.renameFileApi).mockResolvedValue(createFile({ name: 'renamed.csv' }));

			await filesStore.renameFile('file-1', 'project-1', 'renamed.csv');

			expect(filesApi.renameFileApi).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'file-1',
				'renamed.csv',
			);
			expect(filesStore.files[0].name).toBe('renamed.csv');
		});
	});

	describe('deleteFile', () => {
		it('should delete the file and update local state', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 2,
				data: [createFile(), createFile({ id: 'file-2' })],
			});
			await filesStore.fetchFiles('project-1', 1, 10);

			vi.mocked(filesApi.deleteFileApi).mockResolvedValue({ deleted: true, name: 'test.csv' });

			await filesStore.deleteFile('file-1', 'project-1');

			expect(filesStore.files).toHaveLength(1);
			expect(filesStore.totalCount).toBe(1);
		});
	});

	describe('batchDeleteFiles', () => {
		it('should delete the given files and update local state', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 3,
				data: [createFile(), createFile({ id: 'file-2' }), createFile({ id: 'file-3' })],
			});
			await filesStore.fetchFiles('project-1', 1, 10);

			vi.mocked(filesApi.batchDeleteFilesApi).mockResolvedValue({ deleted: 2 });

			await filesStore.batchDeleteFiles(['file-1', 'file-2'], 'project-1');

			expect(filesApi.batchDeleteFilesApi).toHaveBeenCalledWith(expect.anything(), 'project-1', [
				'file-1',
				'file-2',
			]);
			expect(filesStore.files).toHaveLength(1);
			expect(filesStore.totalCount).toBe(1);
		});
	});

	describe('fileNameExists', () => {
		it('should return true only for an exact name match', async () => {
			vi.mocked(filesApi.fetchFilesApi).mockResolvedValue({
				count: 1,
				data: [createFile({ name: 'my-test.csv' })],
			});

			expect(await filesStore.fileNameExists('project-1', 'test.csv')).toBe(false);
			expect(await filesStore.fileNameExists('project-1', 'my-test.csv')).toBe(true);
		});
	});
});
