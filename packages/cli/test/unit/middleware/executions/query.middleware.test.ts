import { parseGetManyQuery } from '@/executions/query.middleware';
import type { NextFunction } from 'express';
import { mock } from 'jest-mock-extended';
import type * as express from 'express';
import type { ExecutionRequest } from '@/executions/execution.types';

describe('Execution query middleware', () => {
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

		parseGetManyQuery(req, res, nextFn);

		expect(req.getManyQuery).toEqual({ status: ['waiting'], limit: 20 });
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

		parseGetManyQuery(req, res, nextFn);

		expect(req.getManyQuery).toEqual({ id: '123', workflowId: '456', limit: 20 });
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

		parseGetManyQuery(req, res, nextFn);

		expect(req.getManyQuery).toEqual({ firstId: '111', lastId: '999', limit: 20 });
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

		parseGetManyQuery(req, res, nextFn);

		expect(req.getManyQuery).toEqual({ limit: 50 });
		expect(nextFn).toBeCalledTimes(1);
	});
});
