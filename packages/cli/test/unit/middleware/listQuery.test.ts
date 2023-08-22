import { filterListQueryMiddleware } from '@/middlewares/listQuery/filter';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger } from '@/Logger';
import { selectListQueryMiddleware } from '@/middlewares/listQuery/select';
import { paginationListQueryMiddleware } from '@/middlewares/listQuery/pagination';
import * as ResponseHelper from '@/ResponseHelper';
import type { ListQuery } from '@/requests';
import type { Response, NextFunction } from 'express';

describe('List query middleware', () => {
	let mockReq: ListQuery.Request;
	let mockRes: Response;
	let nextFn: NextFunction = jest.fn();
	let args: [ListQuery.Request, Response, NextFunction];

	let sendErrorResponse: jest.SpyInstance;

	beforeEach(() => {
		jest.restoreAllMocks();

		LoggerProxy.init(getLogger());
		mockReq = { baseUrl: '/rest/workflows' } as ListQuery.Request;
		mockRes = { status: () => ({ json: jest.fn() }) } as unknown as Response;
		args = [mockReq, mockRes, nextFn];

		sendErrorResponse = jest.spyOn(ResponseHelper, 'sendErrorResponse');
	});

	describe('Query filter', () => {
		test('should not set filter on request if none sent', async () => {
			mockReq.query = {};

			await filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse valid filter', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }' };

			await filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ filter: { name: 'My Workflow' } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should ignore invalid filter', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow", "foo": "bar" }' };

			await filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ filter: { name: 'My Workflow' } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should throw on invalid JSON', async () => {
			mockReq.query = { filter: '{ "name" : "My Workflow"' };

			await filterListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('should throw on valid filter with invalid type', async () => {
			mockReq.query = { filter: '{ "name" : 123 }' };

			await filterListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});

	describe('Query select', () => {
		test('should not set select on request if none sent', async () => {
			mockReq.query = {};

			await filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

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

			selectListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('throw on non-string-array JSON for select', () => {
			mockReq.query = { select: '"name"' };

			selectListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});

	describe('Query pagination', () => {
		test('should not set pagination options on request if none sent', async () => {
			mockReq.query = {};

			await filterListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

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

			paginationListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('should throw on non-numeric-integer skip', () => {
			mockReq.query = { take: '3', skip: '3.2' };

			paginationListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});

	describe('Combinations', () => {
		test('should combine filter with select', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }', select: '["name", "id"]' };

			await filterListQueryMiddleware(...args);
			selectListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({
				select: { name: true, id: true },
				filter: { name: 'My Workflow' },
			});

			expect(nextFn).toBeCalledTimes(2);
		});

		test('should combine filter with pagination options', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }', skip: '1', take: '2' };

			await filterListQueryMiddleware(...args);
			paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({
				filter: { name: 'My Workflow' },
				skip: 1,
				take: 2,
			});

			expect(nextFn).toBeCalledTimes(2);
		});

		test('should combine select with pagination options', async () => {
			mockReq.query = { select: '["name", "id"]', skip: '1', take: '2' };

			selectListQueryMiddleware(...args);
			paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({
				select: { name: true, id: true },
				skip: 1,
				take: 2,
			});

			expect(nextFn).toBeCalledTimes(2);
		});
	});
});
