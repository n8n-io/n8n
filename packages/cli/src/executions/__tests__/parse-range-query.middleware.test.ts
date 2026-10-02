import type { NextFunction } from 'express';
import type * as express from 'express';
import { mock } from 'vitest-mock-extended';

import { encodeExecutionCursor } from '@/executions/execution-cursor';
import type { ExecutionRequest } from '@/executions/execution.types';
import { parseRangeQuery } from '@/executions/parse-range-query.middleware';

describe('`parseRangeQuery` middleware', () => {
	const res = mock<express.Response>({
		status: vi.fn(() => mock<express.Response>({ json: vi.fn() })),
	});

	const nextFn: NextFunction = vi.fn();

	/**
	 * The middleware reads the raw express query, which still carries the legacy
	 * `firstId` / `lastId` params that the request type no longer declares. Every
	 * param it reads needs an explicit `undefined`, or `mock` auto-mocks the key
	 * into a function and the middleware sees a value that was never sent.
	 */
	const request = (query: Record<string, string | undefined>) =>
		mock<ExecutionRequest.GetMany>({
			query: {
				cursor: undefined,
				filter: undefined,
				limit: undefined,
				firstId: undefined,
				lastId: undefined,
				...query,
			} as unknown as ExecutionRequest.GetMany['query'],
		});

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	describe('errors', () => {
		test('should fail on invalid JSON', () => {
			const req = request({ filter: '{ "status": ["waiting }' });

			parseRangeQuery(req, res, nextFn);

			expect(nextFn).toBeCalledTimes(0);
			expect(res.status).toBeCalledWith(400);
		});

		test('should fail on invalid schema', () => {
			const req = request({ filter: '{ "status": 123 }' });

			parseRangeQuery(req, res, nextFn);

			expect(nextFn).toBeCalledTimes(0);
			expect(res.status).toBeCalledWith(400);
		});
	});

	describe('filter', () => {
		test('should parse status and mode fields', () => {
			const req = request({ filter: '{ "status": ["waiting"], "mode": "manual" }' });

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.status).toEqual(['waiting']);
			expect(req.rangeQuery.mode).toEqual('manual');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse date-related fields', () => {
			const req = request({
				filter: '{ "startedBefore": "2021-01-01", "startedAfter": "2020-01-01" }',
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.startedBefore).toBe('2021-01-01');
			expect(req.rangeQuery.startedAfter).toBe('2020-01-01');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse `workflowId` field', () => {
			const req = request({ filter: '{ "workflowId": "456" }' });

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.workflowId).toBe('456');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse `projectId` field', () => {
			const req = request({ filter: '{ "projectId": "123" }' });

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.projectId).toBe('123');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should delete invalid fields', () => {
			// `id` is no longer a filter, so it is dropped like any unknown field.
			const req = request({ filter: '{ "workflowId": "456", "id": "123", "test": "789" }' });

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.workflowId).toBe('456');
			expect('id' in req.rangeQuery).toBe(false);
			expect('test' in req.rangeQuery).toBe(false);
			expect(nextFn).toBeCalledTimes(1);
		});
	});

	describe('range', () => {
		test.each(['firstId', 'lastId'])('should reject the legacy `%s` param', (param) => {
			const req = request({ [param]: '111' });

			parseRangeQuery(req, res, nextFn);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(nextFn).not.toHaveBeenCalled();
		});

		test('should parse limit', () => {
			const req = request({ limit: '50' });

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.range.limit).toEqual(50);
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should default limit to 20 if absent', () => {
			const req = request({});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.range.limit).toEqual(20);
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should leave the cursor unset without a `cursor` param', () => {
			const req = request({});

			parseRangeQuery(req, res, nextFn);

			expect(req.cursor).toBeUndefined();
			expect(req.rangeQuery.range.beforeId).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

		// The middleware only decodes the cursor. Each store derives its own page
		// bound from it, so `range.beforeId` stays unset here.
		test('should decode a v1 cursor position', () => {
			const v1 = { id: '123', timestamp: '2026-09-07T12:00:00.000Z' };
			const req = request({ cursor: encodeExecutionCursor({ version: 1, v1 }) });

			parseRangeQuery(req, res, nextFn);

			expect(req.cursor?.v1).toEqual(v1);
			expect(req.rangeQuery.range.beforeId).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should decode a v2 cursor position', () => {
			const v2 = {
				id: '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa',
				timestamp: '2026-09-07T12:00:00.000Z',
			};
			const req = request({ cursor: encodeExecutionCursor({ version: 1, v2 }) });

			parseRangeQuery(req, res, nextFn);

			expect(req.cursor?.v2).toEqual(v2);
			expect(req.cursor?.v1).toBeUndefined();
			expect(req.rangeQuery.range.beforeId).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

		test.each(['not-a-real-cursor', ''])('should reject the invalid cursor %j', (cursor) => {
			const req = request({ cursor });

			parseRangeQuery(req, res, nextFn);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(nextFn).not.toHaveBeenCalled();
		});
	});
});
