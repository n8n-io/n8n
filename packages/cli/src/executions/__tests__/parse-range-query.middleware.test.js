'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const parse_range_query_middleware_1 = require('@/executions/parse-range-query.middleware');
describe('`parseRangeQuery` middleware', () => {
	const res = (0, jest_mock_extended_1.mock)({
		status: () => (0, jest_mock_extended_1.mock)({ json: jest.fn() }),
	});
	const nextFn = jest.fn();
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	describe('errors', () => {
		test('should fail on invalid JSON', () => {
			const statusSpy = jest.spyOn(res, 'status');
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: '{ "status": ["waiting }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(nextFn).toBeCalledTimes(0);
			expect(statusSpy).toBeCalledWith(400);
		});
		test('should fail on invalid schema', () => {
			const statusSpy = jest.spyOn(res, 'status');
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: '{ "status": 123 }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(nextFn).toBeCalledTimes(0);
			expect(statusSpy).toBeCalledWith(400);
		});
	});
	describe('filter', () => {
		test('should parse status and mode fields', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: '{ "status": ["waiting"], "mode": "manual" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.status).toEqual(['waiting']);
			expect(req.rangeQuery.mode).toEqual('manual');
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse date-related fields', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter:
						'{ "startedBefore": "2021-01-01", "startedAfter": "2020-01-01", "waitTill": "true" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.startedBefore).toBe('2021-01-01');
			expect(req.rangeQuery.startedAfter).toBe('2020-01-01');
			expect(req.rangeQuery.waitTill).toBe(true);
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse ID-related fields', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: '{ "id": "123", "workflowId": "456" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.id).toBe('123');
			expect(req.rangeQuery.workflowId).toBe('456');
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse `projectId` field', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: '{ "projectId": "123" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.projectId).toBe('123');
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should delete invalid fields', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: '{ "id": "123", "test": "789" }',
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.id).toBe('123');
			expect('test' in req.rangeQuery).toBe(false);
			expect(nextFn).toBeCalledTimes(1);
		});
	});
	describe('range', () => {
		test('should parse first and last IDs', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: undefined,
					limit: undefined,
					firstId: '111',
					lastId: '999',
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.range.firstId).toBe('111');
			expect(req.rangeQuery.range.lastId).toBe('999');
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should parse limit', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: undefined,
					limit: '50',
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.range.limit).toEqual(50);
			expect(nextFn).toBeCalledTimes(1);
		});
		test('should default limit to 20 if absent', () => {
			const req = (0, jest_mock_extended_1.mock)({
				query: {
					filter: undefined,
					limit: undefined,
					firstId: undefined,
					lastId: undefined,
				},
			});
			(0, parse_range_query_middleware_1.parseRangeQuery)(req, res, nextFn);
			expect(req.rangeQuery.range.limit).toEqual(20);
			expect(nextFn).toBeCalledTimes(1);
		});
	});
});
//# sourceMappingURL=parse-range-query.middleware.test.js.map
