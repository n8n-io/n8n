import { parseRangeQuery } from '@/executions/parse-range-query.middleware';
import type { NextFunction } from 'express';
import { mock } from 'jest-mock-extended';
import type * as express from 'express';
import type { ExecutionRequest } from '@/executions/execution.types';

describe('`parseRangeQuery` middleware', () => {
	const res = mock<express.Response>();
	const nextFn: NextFunction = jest.fn();

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	test('should parse status', () => {
		const req = mock<ExecutionRequest.GetMany>({
			query: {
				filter: '{ "status": ["waiting"] }',
				limit: undefined,
				firstId: undefined,
				lastId: undefined,
			},
		});

		parseRangeQuery(req, res, nextFn);

		expect(req.rangeQuery.status).toEqual(['waiting']);
		expect(nextFn).toBeCalledTimes(1);
	});

	test('should parse execution and workflow IDs', () => {
		const req = mock<ExecutionRequest.GetMany>({
			query: {
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

	test('should parse first and last IDs', () => {
		const req = mock<ExecutionRequest.GetMany>({
			query: {
				filter: undefined,
				limit: undefined,
				firstId: '111',
				lastId: '999',
			},
		});

		parseRangeQuery(req, res, nextFn);

		expect(req.rangeQuery.range.firstId).toBe('111');
		expect(req.rangeQuery.range.lastId).toBe('999');
		expect(nextFn).toBeCalledTimes(1);
	});

	test('should parse limit', () => {
		const req = mock<ExecutionRequest.GetMany>({
			query: {
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
});
