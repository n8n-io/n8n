import type { SerializedCursor } from '@n8n/api-types';
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

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	describe('errors', () => {
		test('should fail on invalid JSON', () => {
			const statusSpy = res.status;

			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "status": ["waiting }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(nextFn).toBeCalledTimes(0);
			expect(statusSpy).toBeCalledWith(400);
		});

		test('should fail on invalid schema', () => {
			const statusSpy = res.status;

			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "status": 123 }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(nextFn).toBeCalledTimes(0);
			expect(statusSpy).toBeCalledWith(400);
		});
	});

	describe('filter', () => {
		test('should parse status and mode fields', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "status": ["waiting"], "mode": "manual" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.status).toEqual(['waiting']);
			expect(req.rangeQuery.mode).toEqual('manual');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse date-related fields', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "startedBefore": "2021-01-01", "startedAfter": "2020-01-01" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.startedBefore).toBe('2021-01-01');
			expect(req.rangeQuery.startedAfter).toBe('2020-01-01');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse ID-related fields', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "id": "123", "workflowId": "456" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.id).toBe('123');
			expect(req.rangeQuery.workflowId).toBe('456');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse `projectId` field', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "projectId": "123" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.projectId).toBe('123');
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should delete invalid fields', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: '{ "id": "123", "test": "789" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.id).toBe('123');
			expect('test' in req.rangeQuery).toBe(false);
			expect(nextFn).toBeCalledTimes(1);
		});
	});

	describe('range', () => {
		test('should reject first and last IDs', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: undefined,
					limit: undefined,
					firstId: '111',
					lastId: '999',
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(nextFn).not.toHaveBeenCalled();
		});

		test('should parse limit', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: undefined,
					limit: '50',
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.range.limit).toEqual(50);
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should default limit to 20 if absent', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: undefined,
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.range.limit).toEqual(20);
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should leave `before` unset without a cursor', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: undefined,
					filter: undefined,
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.range.before).toBeUndefined();
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should set range.before from a valid cursor', () => {
			const position = { timestamp: '2026-01-01T00:00:00.000Z', id: '123' };
			const cursor = encodeExecutionCursor({ version: 1, v1: position }) as SerializedCursor;
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor,
					filter: undefined,
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.range.before).toEqual(position);
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should reject an invalid cursor', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
					cursor: 'not-a-real-cursor' as SerializedCursor,
					filter: undefined,
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(nextFn).not.toHaveBeenCalled();
		});
	});
});
