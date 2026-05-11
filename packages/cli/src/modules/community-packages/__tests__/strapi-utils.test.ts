import nock from 'nock';
import axios from 'axios';

import { paginatedRequest, buildStrapiUpdateQuery } from '../strapi-utils';

describe('Strapi utils', () => {
	describe('paginatedRequest', () => {
		const baseUrl = 'https://strapi.test/api/nodes';

		afterEach(() => {
			nock.cleanAll();
		});

		it('should fetch and combine multiple pages of data', async () => {
			const page1 = [
				{
					id: 1,
					attributes: { name: 'Node1', nodeDescription: { name: 'n1', version: 1 } },
				},
			];

			const page2 = [
				{
					id: 2,
					attributes: { name: 'Node2', nodeDescription: { name: 'n2', version: 2 } },
				},
			];

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.reply(200, {
					data: page1,
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 2,
							total: 2,
						},
					},
				});

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.reply(200, {
					data: page2,
					meta: {
						pagination: {
							page: 2,
							pageSize: 25,
							pageCount: 2,
							total: 2,
						},
					},
				});

			const result = await paginatedRequest<(typeof page1)[number]['attributes']>(
				'https://strapi.test/api/nodes',
				{ pagination: { page: 1, pageSize: 25 } },
			);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Node1');
			expect(result[1].name).toBe('Node2');
		});

		it('should return empty array if no data', async () => {
			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.reply(200, {
					data: [],
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 0,
							total: 0,
						},
					},
				});

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });
			expect(result).toEqual([]);
		});

		it('should return single page data', async () => {
			const singlePage = [
				{
					id: 1,
					attributes: {
						name: 'NodeSingle',
						nodeDescription: { name: 'n1', version: 1 },
					},
				},
			];

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.reply(200, {
					data: singlePage,
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 1,
							total: 1,
						},
					},
				});

			const result = await paginatedRequest<(typeof singlePage)[number]['attributes']>(baseUrl, {
				pagination: { page: 1, pageSize: 25 },
			});
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('NodeSingle');
		});

		it('should return an empty array if the request fails', async () => {
			const endpoint = '/nodes';

			nock(baseUrl).get(endpoint).query(true).replyWithError('Request failed');

			const result = await paginatedRequest(`${baseUrl}${endpoint}`, {
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toEqual([]);
		});

		it('should apply the correct timeout value to axios requests', async () => {
			const axiosGetSpy = jest.spyOn(axios, 'get');

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.reply(200, {
					data: [],
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 0,
							total: 0,
						},
					},
				});

			await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(axiosGetSpy).toHaveBeenCalledWith(
				baseUrl,
				expect.objectContaining({
					timeout: 6000,
				}),
			);

			axiosGetSpy.mockRestore();
		});

		it('should handle timeout errors and return empty array', async () => {
			const timeoutError = new Error('timeout of 6000ms exceeded');
			timeoutError.name = 'AxiosError';
			(timeoutError as any).code = 'ECONNABORTED';

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.delayConnection(7000) // Delay longer than timeout
				.reply(200, { data: [] });

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(result).toEqual([]);
		});

		it('should handle network timeout and continue gracefully', async () => {
			// Mock axios to simulate timeout
			const axiosGetSpy = jest.spyOn(axios, 'get').mockRejectedValueOnce(
				Object.assign(new Error('timeout of 6000ms exceeded'), {
					code: 'ECONNABORTED',
					name: 'AxiosError',
				}),
			);

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(result).toEqual([]);
			expect(axiosGetSpy).toHaveBeenCalledWith(
				baseUrl,
				expect.objectContaining({
					timeout: 6000,
				}),
			);

			axiosGetSpy.mockRestore();
		});

		it('should always include entry IDs in results', async () => {
			const data = [
				{
					id: 123,
					attributes: { name: 'Node1', version: '1.0.0' },
				},
			];

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true)
				.reply(200, {
					data,
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 1,
							total: 1,
						},
					},
				});

			const result = await paginatedRequest(baseUrl, { pagination: { page: 1, pageSize: 25 } });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ id: 123, name: 'Node1', version: '1.0.0' });
		});

		it('should pass filters parameter to API', async () => {
			const data = [
				{
					id: 1,
					attributes: { name: 'FilteredNode', status: 'active' },
				},
			];

			const axiosGetSpy = jest.spyOn(axios, 'get');

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true) // Accept any query
				.reply(200, {
					data,
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 1,
							total: 1,
						},
					},
				});

			const result = await paginatedRequest<{ name: string; status: string }>(baseUrl, {
				filters: { status: { $eq: 'active' } },
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('FilteredNode');
			// Verify that filters were passed to axios
			expect(axiosGetSpy).toHaveBeenCalledWith(
				baseUrl,
				expect.objectContaining({
					params: expect.objectContaining({
						filters: { status: { $eq: 'active' } },
					}),
				}),
			);

			axiosGetSpy.mockRestore();
		});

		it('should pass fields parameter to API', async () => {
			const data = [
				{
					id: 1,
					attributes: { name: 'Node1' },
				},
			];

			const axiosGetSpy = jest.spyOn(axios, 'get');

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true) // Accept any query
				.reply(200, {
					data,
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 1,
							total: 1,
						},
					},
				});

			const result = await paginatedRequest<{ name: string }>(baseUrl, {
				fields: ['name', 'version'],
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Node1');
			// Verify that fields were passed to axios
			expect(axiosGetSpy).toHaveBeenCalledWith(
				baseUrl,
				expect.objectContaining({
					params: expect.objectContaining({
						fields: ['name', 'version'],
					}),
				}),
			);

			axiosGetSpy.mockRestore();
		});

		it('should pass both filters and fields parameters together', async () => {
			const data = [
				{
					id: 1,
					attributes: { name: 'Node1', status: 'active' },
				},
			];

			const axiosGetSpy = jest.spyOn(axios, 'get');

			nock('https://strapi.test')
				.get('/api/nodes')
				.query(true) // Accept any query
				.reply(200, {
					data,
					meta: {
						pagination: {
							page: 1,
							pageSize: 25,
							pageCount: 1,
							total: 1,
						},
					},
				});

			const result = await paginatedRequest<{ name: string; status: string }>(baseUrl, {
				filters: { status: { $eq: 'active' } },
				fields: ['name'],
				pagination: { page: 1, pageSize: 25 },
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Node1');
			// Verify that both filters and fields were passed to axios
			expect(axiosGetSpy).toHaveBeenCalledWith(
				baseUrl,
				expect.objectContaining({
					params: expect.objectContaining({
						filters: { status: { $eq: 'active' } },
						fields: ['name'],
					}),
				}),
			);

			axiosGetSpy.mockRestore();
		});
	});

	describe('buildStrapiUpdateQuery', () => {
		it('should build query with single ID', () => {
			const result = buildStrapiUpdateQuery([1]);

			expect(result).toEqual({
				filters: {
					id: {
						$in: [1],
					},
				},
			});
		});

		it('should build query with multiple IDs', () => {
			const result = buildStrapiUpdateQuery([1, 2, 3]);

			expect(result).toEqual({
				filters: {
					id: {
						$in: [1, 2, 3],
					},
				},
			});
		});

		it('should build query with empty array', () => {
			const result = buildStrapiUpdateQuery([]);

			expect(result).toEqual({
				filters: {
					id: {
						$in: [],
					},
				},
			});
		});
	});
});
