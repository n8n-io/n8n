import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import { paginatedRequest, buildStrapiUpdateQuery } from '../strapi-utils';

const page = <T>(
	data: Array<{ id: number; attributes: T }>,
	pagination: { page: number; pageCount: number },
) => ({
	data,
	meta: {
		pagination: {
			page: pagination.page,
			pageSize: 25,
			pageCount: pagination.pageCount,
			total: data.length,
		},
	},
});

describe('Strapi utils', () => {
	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	mockInstance(OutboundHttp, { requests });

	beforeEach(() => {
		vi.clearAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
	});

	describe('paginatedRequest', () => {
		const baseUrl = 'https://strapi.test/api/nodes';

		it('should fetch and combine multiple pages of data', async () => {
			const page1 = [
				{ id: 1, attributes: { name: 'Node1', nodeDescription: { name: 'n1', version: 1 } } },
			];
			const page2 = [
				{ id: 2, attributes: { name: 'Node2', nodeDescription: { name: 'n2', version: 2 } } },
			];

			request
				.mockResolvedValueOnce(page(page1, { page: 1, pageCount: 2 }))
				.mockResolvedValueOnce(page(page2, { page: 2, pageCount: 2 }));

			const result = await paginatedRequest<(typeof page1)[number]['attributes']>(baseUrl, {
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Node1');
			expect(result[1].name).toBe('Node2');
			expect(request).toHaveBeenCalledTimes(2);
		});

		it('should return empty array if no data', async () => {
			request.mockResolvedValueOnce(page([], { page: 1, pageCount: 0 }));

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });
			expect(result).toEqual([]);
		});

		it('should return single page data', async () => {
			const singlePage = [
				{ id: 1, attributes: { name: 'NodeSingle', nodeDescription: { name: 'n1', version: 1 } } },
			];
			request.mockResolvedValueOnce(page(singlePage, { page: 1, pageCount: 1 }));

			const result = await paginatedRequest<(typeof singlePage)[number]['attributes']>(baseUrl, {
				pagination: { page: 1, pageSize: 25 },
			});
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('NodeSingle');
		});

		it('should return an empty array if the request fails', async () => {
			request.mockRejectedValueOnce(new Error('Request failed'));

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(result).toEqual([]);
		});

		it('should re-throw when throwOnError is set', async () => {
			request.mockRejectedValueOnce(new Error('Request failed'));

			await expect(
				paginatedRequest(
					baseUrl,
					{ pagination: { page: 1, pageSize: 25 } },
					{ throwOnError: true },
				),
			).rejects.toThrow('Request failed');
		});

		it('should issue a GET with SSRF disabled, JSON, and the 6000ms timeout', async () => {
			request.mockResolvedValueOnce(page([], { page: 1, pageCount: 0 }));

			await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled', timeout: 6000 });
			expect(request).toHaveBeenCalledWith({
				url: baseUrl,
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
				qs: { pagination: { page: 1, pageSize: 25 } },
				json: true,
			});
		});

		it('should handle network timeout and continue gracefully', async () => {
			request.mockRejectedValueOnce(
				Object.assign(new Error('timeout of 6000ms exceeded'), {
					code: 'ECONNABORTED',
					name: 'AxiosError',
				}),
			);

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(result).toEqual([]);
			expect(requests).toHaveBeenCalledWith(expect.objectContaining({ timeout: 6000 }));
		});

		it('should always include entry IDs in results', async () => {
			const data = [{ id: 123, attributes: { name: 'Node1', version: '1.0.0' } }];
			request.mockResolvedValueOnce(page(data, { page: 1, pageCount: 1 }));

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ id: 123, name: 'Node1', version: '1.0.0' });
		});

		it('should pass filters parameter to the request query', async () => {
			const data = [{ id: 1, attributes: { name: 'FilteredNode', status: 'active' } }];
			request.mockResolvedValueOnce(page(data, { page: 1, pageCount: 1 }));

			const result = await paginatedRequest<{ name: string; status: string }>(baseUrl, {
				filters: { status: { $eq: 'active' } },
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('FilteredNode');
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					qs: expect.objectContaining({ filters: { status: { $eq: 'active' } } }),
				}),
			);
		});

		it('should pass fields parameter to the request query', async () => {
			const data = [{ id: 1, attributes: { name: 'Node1' } }];
			request.mockResolvedValueOnce(page(data, { page: 1, pageCount: 1 }));

			const result = await paginatedRequest<{ name: string }>(baseUrl, {
				fields: ['name', 'version'],
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Node1');
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({ qs: expect.objectContaining({ fields: ['name', 'version'] }) }),
			);
		});

		it('should pass both filters and fields parameters together', async () => {
			const data = [{ id: 1, attributes: { name: 'Node1', status: 'active' } }];
			request.mockResolvedValueOnce(page(data, { page: 1, pageCount: 1 }));

			const result = await paginatedRequest<{ name: string; status: string }>(baseUrl, {
				filters: { status: { $eq: 'active' } },
				fields: ['name'],
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Node1');
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					qs: expect.objectContaining({
						filters: { status: { $eq: 'active' } },
						fields: ['name'],
					}),
				}),
			);
		});
		describe('Strapi v5 (flattened) schema support', () => {
			it('should flatten v5 entities and drop documentId', async () => {
				request.mockResolvedValueOnce({
					data: [{ id: 1, documentId: 'doc-1', name: 'Node1', version: '1.0.0' }],
					meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
				});

				const result = await paginatedRequest<{ name: string; version: string }>(baseUrl, {
					pagination: { page: 1, pageSize: 25 },
				});

				expect(result).toEqual([{ id: 1, name: 'Node1', version: '1.0.0' }]);
			});

			it('should paginate across multiple pages of v5 entities', async () => {
				request
					.mockResolvedValueOnce({
						data: [{ id: 1, documentId: 'doc-1', name: 'Node1' }],
						meta: { pagination: { page: 1, pageSize: 25, pageCount: 2, total: 2 } },
					})
					.mockResolvedValueOnce({
						data: [{ id: 2, documentId: 'doc-2', name: 'Node2' }],
						meta: { pagination: { page: 2, pageSize: 25, pageCount: 2, total: 2 } },
					});

				const result = await paginatedRequest<{ name: string }>(baseUrl, {
					pagination: { page: 1, pageSize: 25 },
				});

				expect(result).toEqual([
					{ id: 1, name: 'Node1' },
					{ id: 2, name: 'Node2' },
				]);
			});

			it('should flatten v5 entities that have no documentId', async () => {
				request.mockResolvedValueOnce({
					data: [{ id: 1, name: 'Node1', version: '2.0.0' }],
					meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
				});

				const result = await paginatedRequest<{ name: string; version: string }>(baseUrl, {
					pagination: { page: 1, pageSize: 25 },
				});

				expect(result).toEqual([{ id: 1, name: 'Node1', version: '2.0.0' }]);
			});

			it('should treat a non-object "attributes" field as v5 data and keep sibling fields', async () => {
				request.mockResolvedValueOnce({
					data: [{ id: 1, documentId: 'doc-1', name: 'Node1', attributes: null }],
					meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
				});

				const result = await paginatedRequest<{ name: string; attributes: null }>(baseUrl, {
					pagination: { page: 1, pageSize: 25 },
				});

				// `attributes: null` is real data, not the v4 wrapper, so sibling fields must survive
				expect(result).toEqual([{ id: 1, name: 'Node1', attributes: null }]);
			});

			it('should handle a response that mixes v4 (wrapped) and v5 (flattened) entities', async () => {
				request.mockResolvedValueOnce({
					data: [
						{ id: 1, attributes: { name: 'WrappedNode', version: '1.0.0' } },
						{ id: 2, documentId: 'doc-2', name: 'FlatNode', version: '2.0.0' },
					],
					meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
				});

				const result = await paginatedRequest<{ name: string; version: string }>(baseUrl, {
					pagination: { page: 1, pageSize: 25 },
				});

				expect(result).toEqual([
					{ id: 1, name: 'WrappedNode', version: '1.0.0' },
					{ id: 2, name: 'FlatNode', version: '2.0.0' },
				]);
			});
		});
	});

	describe('buildStrapiUpdateQuery', () => {
		it('should build query with single ID', () => {
			const result = buildStrapiUpdateQuery([1]);

			expect(result).toEqual({ filters: { id: { $in: [1] } } });
		});

		it('should build query with multiple IDs', () => {
			const result = buildStrapiUpdateQuery([1, 2, 3]);

			expect(result).toEqual({ filters: { id: { $in: [1, 2, 3] } } });
		});

		it('should build query with empty array', () => {
			const result = buildStrapiUpdateQuery([]);

			expect(result).toEqual({ filters: { id: { $in: [] } } });
		});
	});
});
