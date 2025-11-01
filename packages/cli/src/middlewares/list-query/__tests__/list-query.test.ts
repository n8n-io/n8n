import type { ListQueryDb } from '@n8n/db';
import type { Response, NextFunction } from 'express';

import { filterListQueryMiddleware } from '@/middlewares/list-query/filter';
import { paginationListQueryMiddleware } from '@/middlewares/list-query/pagination';
import { selectListQueryMiddleware } from '@/middlewares/list-query/select';
import type { ListQuery } from '@/requests';
import * as ResponseHelper from '@/response-helper';

import { sortByQueryMiddleware } from '../sort-by';

describe('List query middleware', () => {
	let mockReq: ListQuery.Request;
	let mockRes: Response;
	const nextFn: NextFunction = jest.fn();
	let args: [ListQuery.Request, Response, NextFunction];

	let sendErrorResponse: jest.SpyInstance;

	beforeEach(() => {
		jest.restoreAllMocks();

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

		test('should parse valid select', async () => {
			mockReq.query = { select: '["name", "id"]' };

			await selectListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ select: { name: true, id: true } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('ignore invalid select', async () => {
			mockReq.query = { select: '["name", "foo"]' };

			await selectListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ select: { name: true } });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('throw on invalid JSON', async () => {
			mockReq.query = { select: '["name"' };

			await selectListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('throw on non-string-array JSON for select', async () => {
			mockReq.query = { select: '"name"' };

			await selectListQueryMiddleware(...args);

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

		test('should parse valid pagination', async () => {
			mockReq.query = { skip: '1', take: '2' };
			await paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ skip: 1, take: 2 });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should throw on skip without take', async () => {
			mockReq.query = { skip: '1' };
			await paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('should default skip to 0', async () => {
			mockReq.query = { take: '2' };
			await paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ skip: 0, take: 2 });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should cap take at 50', async () => {
			mockReq.query = { take: '51' };

			await paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({ skip: 0, take: 50 });
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should throw on non-numeric-integer take', async () => {
			mockReq.query = { take: '3.2' };

			await paginationListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('should throw on non-numeric-integer skip', async () => {
			mockReq.query = { take: '3', skip: '3.2' };

			await paginationListQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});
	});

	describe('Query sort by', () => {
		const validCases: Array<{ name: string; value: ListQueryDb.Workflow.SortOrder }> = [
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

		const invalidCases: Array<{ name: string; value: string }> = [
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

			await sortByQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toMatchObject(
				expect.objectContaining({
					sortBy: value,
				}),
			);
			expect(nextFn).toBeCalledTimes(1);
		});

		test.each(invalidCases)('should fail validation when $name', async ({ value }) => {
			mockReq.query = {
				sortBy: value as ListQueryDb.Workflow.SortOrder,
			};

			await sortByQueryMiddleware(...args);

			expect(sendErrorResponse).toHaveBeenCalledTimes(1);
		});

		test('should not pass sortBy to listQueryOptions if not provided', async () => {
			mockReq.query = {};

			await sortByQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});
	});

	describe('Combinations', () => {
		test('should combine filter with select', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }', select: '["name", "id"]' };

			await filterListQueryMiddleware(...args);
			await selectListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({
				select: { name: true, id: true },
				filter: { name: 'My Workflow' },
			});

			expect(nextFn).toBeCalledTimes(2);
		});

		test('should combine filter with pagination options', async () => {
			mockReq.query = { filter: '{ "name": "My Workflow" }', skip: '1', take: '2' };

			await filterListQueryMiddleware(...args);
			await paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({
				filter: { name: 'My Workflow' },
				skip: 1,
				take: 2,
			});

			expect(nextFn).toBeCalledTimes(2);
		});

		test('should combine select with pagination options', async () => {
			mockReq.query = { select: '["name", "id"]', skip: '1', take: '2' };

			await selectListQueryMiddleware(...args);
			await paginationListQueryMiddleware(...args);

			expect(mockReq.listQueryOptions).toEqual({
				select: { name: true, id: true },
				skip: 1,
				take: 2,
			});

			expect(nextFn).toBeCalledTimes(2);
		});
	});
});
