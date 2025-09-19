import type { NextFunction } from 'express';
import type * as express from 'express';
import { mock } from 'jest-mock-extended';

import type { ExecutionRequest } from '@/executions/execution.types';
import { parseRangeQuery } from '@/executions/parse-range-query.middleware';

describe('`parseRangeQuery` middleware', () => {
	const res = mock<express.Response>({
		status: () => mock<express.Response>({ json: jest.fn() }),
	});

	const nextFn: NextFunction = jest.fn();

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('errors', () => {
		test('should fail on invalid JSON', () => {
			const statusSpy = jest.spyOn(res, 'status');

			const req = mock<ExecutionRequest.GetMany>({
				query: {
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
			const statusSpy = jest.spyOn(res, 'status');

			const req = mock<ExecutionRequest.GetMany>({
				query: {
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
					filter:
						'{ "startedBefore": "2021-01-01", "startedAfter": "2020-01-01", "waitTill": "true" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});

			parseRangeQuery(req, res, nextFn);

			expect(req.rangeQuery.startedBefore).toBe('2021-01-01');
			expect(req.rangeQuery.startedAfter).toBe('2020-01-01');
			expect(req.rangeQuery.waitTill).toBe(true);
			expect(nextFn).toBeCalledTimes(1);
		});

		test('should parse ID-related fields', () => {
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

		test('should parse `projectId` field', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
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

		test('should default limit to 20 if absent', () => {
			const req = mock<ExecutionRequest.GetMany>({
				query: {
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
	});
});
