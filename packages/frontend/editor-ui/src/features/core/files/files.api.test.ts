import {
	batchDeleteFilesApi,
	deleteFileApi,
	fetchFilesApi,
	fetchFileStorageLimitsApi,
	getFileContentUrl,
	renameFileApi,
	replaceFileContentApi,
	uploadFileApi,
} from '@/features/core/files/files.api';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { expect } from 'vitest';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = { baseUrl: '/rest', pushRef: 'test-push-ref' };

describe('files.api', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchFilesApi', () => {
		it('should list project files with pagination, JSON filter and sort', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ count: 0, data: [] });

			await fetchFilesApi(context, 'project-1', { skip: 10, take: 5 }, { name: 'csv' }, 'name:asc');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'/projects/project-1/files',
				{
					skip: 10,
					take: 5,
					filter: JSON.stringify({ name: 'csv' }),
					sortBy: 'name:asc',
				},
			);
		});

		it('should use the aggregate endpoint when no project id is given', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ count: 0, data: [] });

			await fetchFilesApi(context, '');

			expect(makeRestApiRequest).toHaveBeenCalledWith(expect.anything(), 'GET', '/files', {
				filter: undefined,
				sortBy: undefined,
			});
		});
	});

	describe('uploadFileApi', () => {
		it('should POST multipart form data with the conflict query param', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ id: 'file-1' });

			const file = new File(['content'], 'test.csv', { type: 'text/csv' });
			const onUploadProgress = vi.fn();
			const controller = new AbortController();

			await uploadFileApi(context, 'project-1', file, 'keepBoth', {
				onUploadProgress,
				signal: controller.signal,
			});

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				'/projects/project-1/files?conflict=keepBoth',
				expect.any(FormData),
				{ onUploadProgress, signal: controller.signal },
			);

			const formData = vi.mocked(makeRestApiRequest).mock.calls[0][3] as FormData;
			expect(formData.get('file')).toBe(file);
		});
	});

	describe('replaceFileContentApi', () => {
		it('should PUT multipart form data to the content endpoint', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ id: 'file-1' });

			const file = new File(['new content'], 'test.csv', { type: 'text/csv' });

			await replaceFileContentApi(context, 'project-1', 'file-1', file);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'PUT',
				'/projects/project-1/files/file-1/content',
				expect.any(FormData),
				undefined,
			);
		});
	});

	describe('renameFileApi', () => {
		it('should PATCH the file with the new name', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ id: 'file-1', name: 'renamed.csv' });

			await renameFileApi(context, 'project-1', 'file-1', 'renamed.csv');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'PATCH',
				'/projects/project-1/files/file-1',
				{ name: 'renamed.csv' },
			);
		});
	});

	describe('deleteFileApi', () => {
		it('should DELETE the file', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ deleted: true, name: 'test.csv' });

			const result = await deleteFileApi(context, 'project-1', 'file-1');

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'DELETE',
				'/projects/project-1/files/file-1',
			);
			expect(result).toEqual({ deleted: true, name: 'test.csv' });
		});
	});

	describe('batchDeleteFilesApi', () => {
		it('should POST the file ids to the batch-delete endpoint', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({ deleted: 2 });

			await batchDeleteFilesApi(context, 'project-1', ['file-1', 'file-2']);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				'/projects/project-1/files/batch-delete',
				{ fileIds: ['file-1', 'file-2'] },
			);
		});
	});

	describe('fetchFileStorageLimitsApi', () => {
		it('should GET the aggregate limits endpoint', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({
				totalBytes: 100,
				maxBytes: 1000,
				quotaStatus: 'ok',
			});

			const result = await fetchFileStorageLimitsApi(context);

			expect(makeRestApiRequest).toHaveBeenCalledWith(expect.anything(), 'GET', '/files/limits');
			expect(result.quotaStatus).toBe('ok');
		});
	});

	describe('getFileContentUrl', () => {
		it('should build an absolute content URL from a relative rest base', () => {
			const url = getFileContentUrl(context, 'project-1', 'file-1', 'view');

			expect(url).toBe(
				`${window.location.origin}/rest/projects/project-1/files/file-1/content?action=view`,
			);
		});

		it('should keep an absolute rest base as-is', () => {
			const url = getFileContentUrl(
				{ baseUrl: 'https://example.com/rest', pushRef: '' },
				'project-1',
				'file-1',
				'download',
			);

			expect(url).toBe(
				'https://example.com/rest/projects/project-1/files/file-1/content?action=download',
			);
		});
	});
});
