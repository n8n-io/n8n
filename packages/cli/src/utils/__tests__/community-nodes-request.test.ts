import type { CommunityNodeData } from '@n8n/api-types';
import nock from 'nock';

import { paginatedRequest } from '../community-nodes-request-utils';

describe('strapiPaginatedRequest', () => {
	const baseUrl = 'https://strapi.test/api/nodes';

	afterEach(() => {
		nock.cleanAll();
	});

	it('should fetch and combine multiple pages of data', async () => {
		const page1 = [
			{
				id: 1,
				attributes: { name: 'Node1', nodeDescription: { name: 'n1', version: 1 } } as any,
			},
		];

		const page2 = [
			{
				id: 2,
				attributes: { name: 'Node2', nodeDescription: { name: 'n2', version: 2 } } as any,
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

		const result = await paginatedRequest('https://strapi.test/api/nodes');

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe(1);
		expect(result[1].id).toBe(2);
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

		const result = await paginatedRequest(baseUrl);
		expect(result).toEqual([]);
	});

	it('should return single page data', async () => {
		const singlePage: CommunityNodeData[] = [
			{
				id: 1,
				attributes: {
					name: 'NodeSingle',
					nodeDescription: { name: 'n1', version: 1 },
				} as any,
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

		const result = await paginatedRequest(baseUrl);
		expect(result).toHaveLength(1);
		expect(result[0].attributes.name).toBe('NodeSingle');
	});

	it('should return an empty array if the request fails', async () => {
		const endpoint = '/nodes';

		nock(baseUrl).get(endpoint).query(true).replyWithError('Request failed');

		const result = await paginatedRequest(`${baseUrl}${endpoint}`);

		expect(result).toEqual([]);
	});
});
