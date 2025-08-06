import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticatedFetch, get, post, postWithFiles, put, patch, del } from '@/api/generic';

describe('generic API', () => {
	const originalFetch = global.fetch;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.clearAllMocks();
	});

	describe('authenticatedFetch', () => {
		it('should make a basic fetch request with default headers', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await authenticatedFetch('/api/test');

			expect(mockFetch).toHaveBeenCalledWith('/api/test', {
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			expect(result).toEqual({ success: true });
		});

		it('should handle authorization token when available', async () => {
			// Note: The getAccessToken function always returns empty string in the current implementation
			// This test documents the current behavior
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await authenticatedFetch('/api/test');

			expect(mockFetch).toHaveBeenCalledWith('/api/test', {
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});

		it('should merge custom headers with default headers', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await authenticatedFetch('/api/test', {
				headers: {
					'Custom-Header': 'custom-value',
				},
			});

			expect(mockFetch).toHaveBeenCalledWith('/api/test', {
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
					'Custom-Header': 'custom-value',
				},
			});
		});

		it('should handle FormData body and remove Content-Type header', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const formData = new FormData();
			formData.append('key', 'value');

			await authenticatedFetch('/api/upload', {
				method: 'POST',
				body: formData,
			});

			expect(mockFetch).toHaveBeenCalledWith('/api/upload', {
				method: 'POST',
				body: formData,
				mode: 'cors',
				cache: 'no-cache',
				headers: {},
			});
		});

		it('should handle JSON parsing errors and fallback to text', async () => {
			const mockClonedResponse = {
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
			};
			const mockResponse = {
				clone: vi.fn(() => mockClonedResponse),
				text: vi.fn().mockResolvedValue('Plain text response'),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await authenticatedFetch('/api/test');

			expect(mockResponse.clone).toHaveBeenCalled();
			expect(mockClonedResponse.json).toHaveBeenCalled();
			expect(mockResponse.text).toHaveBeenCalled();
			expect(result).toBe('Plain text response');
		});

		it('should preserve request options', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await authenticatedFetch('/api/test', {
				method: 'POST',
				credentials: 'include',
				custom: 'option',
			} as RequestInit);

			expect(mockFetch).toHaveBeenCalledWith('/api/test', {
				method: 'POST',
				credentials: 'include',
				custom: 'option',
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});
	});

	describe('get', () => {
		it('should make a GET request without query parameters', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ data: 'test' }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const result = await get('/api/users');

			expect(mockFetch).toHaveBeenCalledWith('/api/users', {
				method: 'GET',
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			expect(result).toEqual({ data: 'test' });
		});

		it('should append query parameters to URL', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ data: 'test' }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await get('/api/users', { page: '1', limit: '10' });

			expect(mockFetch).toHaveBeenCalledWith('/api/users?page=1&limit=10', {
				method: 'GET',
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});

		it('should handle empty query object', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ data: 'test' }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await get('/api/users', {});

			expect(mockFetch).toHaveBeenCalledWith('/api/users', {
				method: 'GET',
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});

		it('should merge additional options', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ data: 'test' }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await get(
				'/api/users',
				{},
				{
					headers: { 'Custom-Header': 'value' },
				},
			);

			expect(mockFetch).toHaveBeenCalledWith('/api/users', {
				method: 'GET',
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
					'Custom-Header': 'value',
				},
			});
		});
	});

	describe('post', () => {
		it('should make a POST request with JSON body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ id: 1 }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const body = { name: 'John', email: 'john@example.com' };
			const result = await post('/api/users', body);

			expect(mockFetch).toHaveBeenCalledWith('/api/users', {
				method: 'POST',
				body: JSON.stringify(body),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			expect(result).toEqual({ id: 1 });
		});

		it('should handle empty body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await post('/api/action');

			expect(mockFetch).toHaveBeenCalledWith('/api/action', {
				method: 'POST',
				body: JSON.stringify({}),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});

		it('should merge additional options', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await post(
				'/api/users',
				{ name: 'John' },
				{
					headers: { 'X-Request-ID': '123' },
				},
			);

			expect(mockFetch).toHaveBeenCalledWith('/api/users', {
				method: 'POST',
				body: JSON.stringify({ name: 'John' }),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
					'X-Request-ID': '123',
				},
			});
		});
	});

	describe('postWithFiles', () => {
		it('should make a POST request with FormData containing files', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ uploaded: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
			const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
			const body = { description: 'File upload' };

			const result = await postWithFiles('/api/upload', body, [file1, file2]);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const [url, options] = mockFetch.mock.calls[0];
			expect(url).toBe('/api/upload');
			expect(options.method).toBe('POST');
			expect(options.body).toBeInstanceOf(FormData);
			expect(options.headers).toEqual({});
			expect(result).toEqual({ uploaded: true });

			// Verify FormData contents
			const formData = options.body as FormData;
			expect(formData.get('description')).toBe('File upload');
			expect(formData.getAll('files')).toHaveLength(2);
			expect(formData.getAll('files')[0]).toBe(file1);
			expect(formData.getAll('files')[1]).toBe(file2);
		});

		it('should handle empty body and files', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await postWithFiles('/api/upload');

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const [, options] = mockFetch.mock.calls[0];
			const formData = options.body as FormData;

			// FormData should be empty except for structure
			expect([...formData.keys()]).toHaveLength(0);
		});

		it('should handle body without files', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const body = { name: 'test', value: 'data' };
			await postWithFiles('/api/upload', body, []);

			const [, options] = mockFetch.mock.calls[0];
			const formData = options.body as FormData;

			expect(formData.get('name')).toBe('test');
			expect(formData.get('value')).toBe('data');
			expect(formData.getAll('files')).toHaveLength(0);
		});

		it('should merge additional options', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await postWithFiles('/api/upload', {}, [], {
				headers: { 'X-Upload-ID': '123' },
			});

			const [, options] = mockFetch.mock.calls[0];
			expect(options.headers['X-Upload-ID']).toBe('123');
		});
	});

	describe('put', () => {
		it('should make a PUT request with JSON body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ updated: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const body = { name: 'Updated Name' };
			const result = await put('/api/users/1', body);

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'PUT',
				body: JSON.stringify(body),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			expect(result).toEqual({ updated: true });
		});

		it('should handle empty body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await put('/api/users/1');

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'PUT',
				body: JSON.stringify({}),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});
	});

	describe('patch', () => {
		it('should make a PATCH request with JSON body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ patched: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const body = { status: 'active' };
			const result = await patch('/api/users/1', body);

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'PATCH',
				body: JSON.stringify(body),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			expect(result).toEqual({ patched: true });
		});

		it('should merge additional options', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await patch(
				'/api/users/1',
				{},
				{
					headers: { 'If-Match': 'etag123' },
				},
			);

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'PATCH',
				body: JSON.stringify({}),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
					'If-Match': 'etag123',
				},
			});
		});
	});

	describe('del', () => {
		it('should make a DELETE request with JSON body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ deleted: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const body = { reason: 'User requested deletion' };
			const result = await del('/api/users/1', body);

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'DELETE',
				body: JSON.stringify(body),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			expect(result).toEqual({ deleted: true });
		});

		it('should handle empty body', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await del('/api/users/1');

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'DELETE',
				body: JSON.stringify({}),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
				},
			});
		});

		it('should merge additional options', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockResolvedValue({ success: true }),
				})),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await del(
				'/api/users/1',
				{},
				{
					headers: { 'X-Confirm': 'true' },
				},
			);

			expect(mockFetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'DELETE',
				body: JSON.stringify({}),
				mode: 'cors',
				cache: 'no-cache',
				headers: {
					'Content-Type': 'application/json',
					'X-Confirm': 'true',
				},
			});
		});
	});

	describe('error handling', () => {
		it('should handle fetch network errors', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			await expect(get('/api/test')).rejects.toThrow('Network error');
		});

		it('should handle response parsing errors gracefully', async () => {
			const mockResponse = {
				clone: vi.fn(() => ({
					json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
				})),
				text: vi.fn().mockRejectedValue(new Error('Cannot read text')),
			};
			mockFetch.mockResolvedValue(mockResponse);

			await expect(get('/api/test')).rejects.toThrow('Cannot read text');
		});
	});
});
