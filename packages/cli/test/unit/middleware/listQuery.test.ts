import { filterListQueryMiddleware } from '@/middlewares/filter.listQuery.middleware';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import type { Request, Response, NextFunction } from 'express';
import type { ListQueryRequest } from '@/requests';
import { selectListQueryMiddleware } from '@/middlewares/select.listQuery.middleware';
import { paginationListQueryMiddleware } from '@/middlewares/pagination.listQuery.middleware';

describe('List query middleware', () => {
	let mockReq: Partial<ListQueryRequest>;
	let mockRes: Partial<Response>;
	let nextFn: NextFunction = jest.fn();
	let args: [Request, Response, NextFunction];

	beforeEach(() => {
		LoggerProxy.init(getLogger());
		mockReq = { baseUrl: '/rest/workflows' };
		args = [mockReq as Request, mockRes as Response, nextFn];
		jest.restoreAllMocks();
	});

	describe('Query filter', () => {
		test('should parse valid filter', () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }' };
			filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ filter: { name: 'My Workflow' } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should ignore invalid filter', () => {
			mockReq.query = { filter: '{ "name": "My Workflow", "foo": "bar" }' };
			filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ filter: { name: 'My Workflow' } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should throw on invalid JSON', () => {
			mockReq.query = { filter: '{ "name" : "My Workflow"' };
			const call = () => filterListQueryMiddleware(...args);

			expect(call).toThrowError('Failed to parse filter JSON');
		});
	});

	describe('Query select', () => {
		test('should parse valid select', () => {
			mockReq.query = { select: '["name", "id"]' };
			selectListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ select: { name: true, id: true } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('ignore invalid select', () => {
			mockReq.query = { select: '["name", "foo"]' };
			selectListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ select: { name: true } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('throw on invalid JSON', () => {
			mockReq.query = { select: '["name"' };
			const call = () => selectListQueryMiddleware(...args);

			expect(call).toThrowError('Failed to parse select JSON');
		});

		test('throw on non-string-array JSON for select', () => {
			mockReq.query = { select: '"name"' };
			const call = () => selectListQueryMiddleware(...args);

			expect(call).toThrowError('Parsed select is not a string array');
		});
	});

	describe('Query pagination', () => {
		test('should parse valid pagination', () => {
			mockReq.query = { skip: '1', take: '2' };
			paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ skip: 1, take: 2 });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should ignore skip without take', () => {
			mockReq.query = { skip: '1' };
			paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should default skip to 0', () => {
			mockReq.query = { take: '2' };
			paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ skip: 0, take: 2 });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should cap take at 50', () => {
			mockReq.query = { take: '51' };
			paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ skip: 0, take: 50 });
			expect(nextFn).toBeCalledTimes(1);
		});
	});
});
