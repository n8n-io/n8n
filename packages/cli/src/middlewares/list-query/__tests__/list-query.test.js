'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const filter_1 = require('@/middlewares/list-query/filter');
const pagination_1 = require('@/middlewares/list-query/pagination');
const select_1 = require('@/middlewares/list-query/select');
const ResponseHelper = __importStar(require('@/response-helper'));
const sort_by_1 = require('../sort-by');
describe('List query middleware', () => {
	let mockReq;
	let mockRes;
	const nextFn = jest.fn();
	let args;
	let sendErrorResponse;
	beforeEach(() => {
		jest.restoreAllMocks();
		mockReq = { baseUrl: '/rest/workflows' };
		mockRes = { status: () => ({ json: jest.fn() }) };
		args = [mockReq, mockRes, nextFn];
		sendErrorResponse = jest.spyOn(ResponseHelper, 'sendErrorResponse');
	});
	describe('Query filter', () => {
		test('should not set filter on request if none sent', async () => {
			mockReq.query = {};
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse valid filter', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }' };
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ filter: { name: 'My Workflow' } });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should ignore invalid filter', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow", "foo": "bar" }' };
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ filter: { name: 'My Workflow' } });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should throw on invalid JSON', async () => {
			mockReq.query = { filter: '{ "name" : "My Workflow"' };
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
		test('should throw on valid filter with invalid type', async () => {
			mockReq.query = { filter: '{ "name" : 123 }' };
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});
	describe('Query select', () => {
		test('should not set select on request if none sent', async () => {
			mockReq.query = {};
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse valid select', async () => {
			mockReq.query = { select: '["name", "id"]' };
			await (0, select_1.selectListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ select: { name: true, id: true } });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('ignore invalid select', async () => {
			mockReq.query = { select: '["name", "foo"]' };
			await (0, select_1.selectListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ select: { name: true } });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('throw on invalid JSON', async () => {
			mockReq.query = { select: '["name"' };
			await (0, select_1.selectListQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
		test('throw on non-string-array JSON for select', async () => {
			mockReq.query = { select: '"name"' };
			await (0, select_1.selectListQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});
	describe('Query pagination', () => {
		test('should not set pagination options on request if none sent', async () => {
			mockReq.query = {};
			await (0, filter_1.filterListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse valid pagination', async () => {
			mockReq.query = { skip: '1', take: '2' };
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ skip: 1, take: 2 });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should throw on skip without take', async () => {
			mockReq.query = { skip: '1' };
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
		test('should default skip to 0', async () => {
			mockReq.query = { take: '2' };
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ skip: 0, take: 2 });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should cap take at 50', async () => {
			mockReq.query = { take: '51' };
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({ skip: 0, take: 50 });
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should throw on non-numeric-integer take', async () => {
			mockReq.query = { take: '3.2' };
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
		test('should throw on non-numeric-integer skip', async () => {
			mockReq.query = { take: '3', skip: '3.2' };
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});
	describe('Query sort by', () => {
		const validCases = [
			{
				name: 'sorting by name asc',
				value: 'name:asc',
			},
			{
				name: 'sorting by name desc',
				value: 'name:desc',
			},
			{
				name: 'sorting by createdAt asc',
				value: 'createdAt:asc',
			},
			{
				name: 'sorting by createdAt desc',
				value: 'createdAt:desc',
			},
			{
				name: 'sorting by updatedAt asc',
				value: 'updatedAt:asc',
			},
			{
				name: 'sorting by updatedAt desc',
				value: 'updatedAt:desc',
			},
		];
		const invalidCases = [
			{
				name: 'sorting by invalid column',
				value: 'test:asc',
			},
			{
				name: 'sorting by valid column without order',
				value: 'name',
			},
			{
				name: 'sorting by valid column with invalid order',
				value: 'name:test',
			},
		];
		test.each(validCases)('should succeed validation when $name', async ({ value }) => {
			mockReq.query = {
				sortBy: value,
			};
			await (0, sort_by_1.sortByQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toMatchObject(
				expect.objectContaining({
					sortBy: value,
				}),
			);
			expect(nextFn).toBeCalledTimes(1);
		});
		test.each(invalidCases)('should fail validation when $name', async ({ value }) => {
			mockReq.query = {
				sortBy: value,
			};
			await (0, sort_by_1.sortByQueryMiddleware)(...args);
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
		test('should not pass sortBy to listQueryOptions if not provided', async () => {
			mockReq.query = {};
			await (0, sort_by_1.sortByQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});
	});
	describe('Combinations', () => {
		test('should combine filter with select', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }', select: '["name", "id"]' };
			await (0, filter_1.filterListQueryMiddleware)(...args);
			await (0, select_1.selectListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({
				select: { name: true, id: true },
				filter: { name: 'My Workflow' },
			});
			expect(nextFn).toBeCalledTimes(2);
		});
		test('should combine filter with pagination options', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }', skip: '1', take: '2' };
			await (0, filter_1.filterListQueryMiddleware)(...args);
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({
				filter: { name: 'My Workflow' },
				skip: 1,
				take: 2,
			});
			expect(nextFn).toBeCalledTimes(2);
		});
		test('should combine select with pagination options', async () => {
			mockReq.query = { select: '["name", "id"]', skip: '1', take: '2' };
			await (0, select_1.selectListQueryMiddleware)(...args);
			await (0, pagination_1.paginationListQueryMiddleware)(...args);
			expect(mockReq.listQueryOptions).toEqual({
				select: { name: true, id: true },
				skip: 1,
				take: 2,
			});
			expect(nextFn).toBeCalledTimes(2);
		});
	});
});
//# sourceMappingURL=list-query.test.js.map
