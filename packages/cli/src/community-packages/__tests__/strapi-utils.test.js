'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const nock_1 = __importDefault(require('nock'));
const strapi_utils_1 = require('../strapi-utils');
describe('Strapi utils', () => {
	describe('paginatedRequest', () => {
		const baseUrl = 'https://strapi.test/api/nodes';
		afterEach(() => {
			nock_1.default.cleanAll();
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
			(0, nock_1.default)('https://strapi.test')
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
			(0, nock_1.default)('https://strapi.test')
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
			const result = await (0, strapi_utils_1.paginatedRequest)('https://strapi.test/api/nodes');
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Node1');
			expect(result[1].name).toBe('Node2');
		});
		it('should return empty array if no data', async () => {
			(0, nock_1.default)('https://strapi.test')
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
			const result = await (0, strapi_utils_1.paginatedRequest)(baseUrl);
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
			(0, nock_1.default)('https://strapi.test')
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
			const result = await (0, strapi_utils_1.paginatedRequest)(baseUrl);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('NodeSingle');
		});
		it('should return an empty array if the request fails', async () => {
			const endpoint = '/nodes';
			(0, nock_1.default)(baseUrl).get(endpoint).query(true).replyWithError('Request failed');
			const result = await (0, strapi_utils_1.paginatedRequest)(`${baseUrl}${endpoint}`);
			expect(result).toEqual([]);
		});
	});
});
//# sourceMappingURL=strapi-utils.test.js.map
