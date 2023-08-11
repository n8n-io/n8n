import { filterListQueryMiddleware } from '@/middlewares/listQuery/filter';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import type { Request, Response, NextFunction } from 'express';
import type { ListQuery } from '@/requests';
import { selectListQueryMiddleware } from '@/middlewares/listQuery/select';
import { paginationListQueryMiddleware } from '@/middlewares/listQuery/pagination';

describe('List query middleware', () => {
	let mockReq: Partial<ListQuery.Request>;
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

		test('should throw on non-numeric-integer take', () => {
			mockReq.query = { take: '3.2' };
			const call = () => paginationListQueryMiddleware(...args);

			expect(call).toThrowError('Parameter take or skip is not an integer string');
		});

		test('should throw on non-numeric-integer skip', () => {
			mockReq.query = { take: '3', skip: '3.2' };
			const call = () => paginationListQueryMiddleware(...args);

			expect(call).toThrowError('Parameter take or skip is not an integer string');
		});
	});
});
