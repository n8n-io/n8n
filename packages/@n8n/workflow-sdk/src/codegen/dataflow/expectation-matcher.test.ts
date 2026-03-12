import {
	deepPartialMatch,
	deepExactMatch,
	matchRequests,
	matchNodes,
	checkExpectations,
} from './expectation-matcher';
import type { NockRequestRecord, NodeOutputMap } from './expectation-matcher';

describe('deepPartialMatch', () => {
	describe('primitives', () => {
		it('returns empty array for matching strings', () => {
			expect(deepPartialMatch('hello', 'hello', '$')).toEqual([]);
		});

		it('returns empty array for matching numbers', () => {
			expect(deepPartialMatch(42, 42, '$')).toEqual([]);
		});

		it('returns empty array for matching booleans', () => {
			expect(deepPartialMatch(true, true, '$')).toEqual([]);
		});

		it('returns empty array for matching null', () => {
			expect(deepPartialMatch(null, null, '$')).toEqual([]);
		});

		it('returns mismatch for different strings', () => {
			expect(deepPartialMatch('expected', 'actual', '$')).toEqual([
				{ path: '$', expected: 'expected', actual: 'actual' },
			]);
		});

		it('returns mismatch for null vs non-null', () => {
			expect(deepPartialMatch(null, 'hello', '$')).toEqual([
				{ path: '$', expected: null, actual: 'hello' },
			]);
		});
	});

	describe('objects', () => {
		it('matches partial object (extra keys in actual ignored)', () => {
			expect(deepPartialMatch({ a: 1 }, { a: 1, b: 2, c: 3 }, '$')).toEqual([]);
		});

		it('reports missing key as "(missing)"', () => {
			expect(deepPartialMatch({ a: 1, b: 2 }, { a: 1 }, '$')).toEqual([
				{ path: '$.b', expected: 2, actual: '(missing)' },
			]);
		});

		it('collects nested mismatches', () => {
			const expected = { user: { name: 'Alice', age: 30 } };
			const actual = { user: { name: 'Bob', age: 25 } };
			expect(deepPartialMatch(expected, actual, '$')).toEqual([
				{ path: '$.user.name', expected: 'Alice', actual: 'Bob' },
				{ path: '$.user.age', expected: 30, actual: 25 },
			]);
		});

		it('reports mismatch when expected is object but actual is not', () => {
			expect(deepPartialMatch({ a: 1 }, 'string', '$')).toEqual([
				{ path: '$', expected: { a: 1 }, actual: 'string' },
			]);
		});
	});

	describe('arrays', () => {
		it('matches element-by-element', () => {
			expect(deepPartialMatch([1, 2], [1, 2, 3], '$')).toEqual([]);
		});

		it('reports element mismatch', () => {
			expect(deepPartialMatch([1, 'x'], [1, 'y'], '$')).toEqual([
				{ path: '$[1]', expected: 'x', actual: 'y' },
			]);
		});

		it('reports missing element when actual shorter', () => {
			expect(deepPartialMatch([1, 2, 3], [1], '$')).toEqual([
				{ path: '$[1]', expected: 2, actual: '(missing)' },
				{ path: '$[2]', expected: 3, actual: '(missing)' },
			]);
		});

		it('matches empty expected array against anything', () => {
			expect(deepPartialMatch([], [1, 2, 3], '$')).toEqual([]);
		});

		it('matches nested objects inside arrays', () => {
			const expected = [{ name: 'Alice' }];
			const actual = [{ name: 'Alice', age: 30 }];
			expect(deepPartialMatch(expected, actual, '$')).toEqual([]);
		});

		it('reports mismatch when expected is array but actual is not', () => {
			expect(deepPartialMatch([1, 2], 'string', '$')).toEqual([
				{ path: '$', expected: [1, 2], actual: 'string' },
			]);
		});
	});
});

describe('deepExactMatch', () => {
	it('matches identical objects', () => {
		expect(deepExactMatch({ a: 1, b: 2 }, { a: 1, b: 2 }, '$')).toEqual([]);
	});

	it('reports extra keys in actual as "(unexpected)"', () => {
		expect(deepExactMatch({ a: 1 }, { a: 1, b: 2 }, '$')).toEqual([
			{ path: '$.b', expected: '(unexpected)', actual: 2 },
		]);
	});

	it('reports missing keys in actual', () => {
		expect(deepExactMatch({ a: 1, b: 2 }, { a: 1 }, '$')).toEqual([
			{ path: '$.b', expected: 2, actual: '(missing)' },
		]);
	});

	it('reports extra elements in actual array', () => {
		expect(deepExactMatch([1, 2], [1, 2, 3], '$')).toEqual([
			{ path: '$[2]', expected: '(unexpected)', actual: 3 },
		]);
	});

	it('empty expected object fails against non-empty actual', () => {
		expect(deepExactMatch({}, { text: 'hello' }, '$')).toEqual([
			{ path: '$.text', expected: '(unexpected)', actual: 'hello' },
		]);
	});

	it('works recursively on nested objects', () => {
		const expected = { data: { id: 1 } };
		const actual = { data: { id: 1, extra: true } };
		expect(deepExactMatch(expected, actual, '$')).toEqual([
			{ path: '$.data.extra', expected: '(unexpected)', actual: true },
		]);
	});

	it('matches primitives the same as deepPartialMatch', () => {
		expect(deepExactMatch('hello', 'hello', '$')).toEqual([]);
		expect(deepExactMatch(42, 99, '$')).toEqual([{ path: '$', expected: 42, actual: 99 }]);
	});
});

describe('matchRequests', () => {
	const makeRequest = (
		method: string,
		url: string,
		requestBody?: unknown,
		requestHeaders: Record<string, string> = {},
	): NockRequestRecord => ({
		timestamp: Date.now(),
		method,
		url,
		requestHeaders,
		requestBody,
		responseStatus: 200,
		responseHeaders: {},
	});

	it('matches request by METHOD url key', () => {
		const requests = [makeRequest('POST', 'api.example.com/data', { model: 'gpt-4' })];
		const result = matchRequests(
			{ 'POST api.example.com/data': { requestBody: { model: 'gpt-4' } } },
			requests,
		);
		expect(result).toEqual([]);
	});

	it('reports mismatch on wrong body field', () => {
		const requests = [makeRequest('POST', 'api.example.com/data', { model: 'gpt-3' })];
		const result = matchRequests(
			{ 'POST api.example.com/data': { requestBody: { model: 'gpt-4' } } },
			requests,
		);
		expect(result).toEqual([
			{
				path: 'requests[POST api.example.com/data].requestBody.model',
				expected: 'gpt-4',
				actual: 'gpt-3',
			},
		]);
	});

	it('reports "(no matching request)" for missing request', () => {
		const result = matchRequests({ 'GET api.example.com/missing': { requestBody: { a: 1 } } }, []);
		expect(result).toEqual([
			{
				path: 'requests[GET api.example.com/missing]',
				expected: 'request exists',
				actual: '(no matching request)',
			},
		]);
	});

	it('reports extra keys in actual body (exact match)', () => {
		const requests = [makeRequest('POST', 'api.example.com/data', { model: 'gpt-4', extra: true })];
		const result = matchRequests(
			{ 'POST api.example.com/data': { requestBody: { model: 'gpt-4' } } },
			requests,
		);
		expect(result).toEqual([
			{
				path: 'requests[POST api.example.com/data].requestBody.extra',
				expected: '(unexpected)',
				actual: true,
			},
		]);
	});

	it('matches #N suffix for Nth duplicate', () => {
		const requests = [
			makeRequest('POST', 'httpbin.org/post', { first: true }),
			makeRequest('POST', 'httpbin.org/post', { second: true }),
			makeRequest('POST', 'httpbin.org/post', { third: true }),
		];
		const result = matchRequests(
			{
				'POST httpbin.org/post': { requestBody: { first: true } },
				'POST httpbin.org/post#2': { requestBody: { second: true } },
				'POST httpbin.org/post#3': { requestBody: { third: true } },
			},
			requests,
		);
		expect(result).toEqual([]);
	});

	it('matches when actual URL contains query params but expectation does not', () => {
		const requests = [
			makeRequest('GET', '/v1/slots?startTime=2024-01-15&endTime=2024-01-16&timeZone=UTC'),
		];
		const result = matchRequests({ 'GET /v1/slots': {} }, requests);
		expect(result).toEqual([]);
	});

	it('matches requestHeaders via deep partial match', () => {
		const requests = [
			makeRequest(
				'POST',
				'api.example.com/data',
				{},
				{ authorization: 'Bearer tok', 'content-type': 'application/json' },
			),
		];
		const result = matchRequests(
			{ 'POST api.example.com/data': { requestHeaders: { authorization: 'Bearer tok' } } },
			requests,
		);
		expect(result).toEqual([]);
	});

	it('reports mismatch on wrong header value', () => {
		const requests = [
			makeRequest('POST', 'api.example.com/data', {}, { authorization: 'Bearer wrong' }),
		];
		const result = matchRequests(
			{ 'POST api.example.com/data': { requestHeaders: { authorization: 'Bearer correct' } } },
			requests,
		);
		expect(result).toEqual([
			{
				path: 'requests[POST api.example.com/data].requestHeaders.authorization',
				expected: 'Bearer correct',
				actual: 'Bearer wrong',
			},
		]);
	});

	it('matches both requestBody and requestHeaders together', () => {
		const requests = [
			makeRequest(
				'POST',
				'api.example.com/data',
				{ model: 'gpt-4' },
				{ authorization: 'Bearer tok' },
			),
		];
		const result = matchRequests(
			{
				'POST api.example.com/data': {
					requestBody: { model: 'gpt-4' },
					requestHeaders: { authorization: 'Bearer tok' },
				},
			},
			requests,
		);
		expect(result).toEqual([]);
	});

	it('reports mismatch on #2 duplicate', () => {
		const requests = [
			makeRequest('POST', 'httpbin.org/post', { a: 1 }),
			makeRequest('POST', 'httpbin.org/post', { b: 'wrong' }),
		];
		const result = matchRequests(
			{ 'POST httpbin.org/post#2': { requestBody: { b: 'right' } } },
			requests,
		);
		expect(result).toEqual([
			{
				path: 'requests[POST httpbin.org/post#2].requestBody.b',
				expected: 'right',
				actual: 'wrong',
			},
		]);
	});
});

describe('matchNodes', () => {
	it('matches items from output index 0', () => {
		const nodeOutputs: NodeOutputMap = {
			'Set searchInput': {
				outputs: [{ items: [{ searchInput: 'hello' }], outputIndex: 0 }],
			},
		};
		const result = matchNodes(
			{ 'Set searchInput': { items: [{ searchInput: 'hello' }] } },
			nodeOutputs,
		);
		expect(result).toEqual([]);
	});

	it('reports mismatch on wrong item field', () => {
		const nodeOutputs: NodeOutputMap = {
			MyNode: { outputs: [{ items: [{ value: 'actual' }], outputIndex: 0 }] },
		};
		const result = matchNodes({ MyNode: { items: [{ value: 'expected' }] } }, nodeOutputs);
		expect(result).toEqual([
			{
				path: 'nodes[MyNode].items[0].value',
				expected: 'expected',
				actual: 'actual',
			},
		]);
	});

	it('reports "(node not found)" for missing node', () => {
		const result = matchNodes({ Missing: { items: [{ a: 1 }] } }, {});
		expect(result).toEqual([
			{
				path: 'nodes[Missing]',
				expected: 'node exists',
				actual: '(node not found)',
			},
		]);
	});

	it('reports "(no output at index 0)" when node has no outputs', () => {
		const nodeOutputs: NodeOutputMap = {
			MyNode: { outputs: [] },
		};
		const result = matchNodes({ MyNode: { items: [{ a: 1 }] } }, nodeOutputs);
		expect(result).toEqual([
			{
				path: 'nodes[MyNode]',
				expected: 'output at index 0',
				actual: '(no output at index 0)',
			},
		]);
	});
});

describe('checkExpectations', () => {
	it('combines request and node mismatches', () => {
		const nodeOutputs: NodeOutputMap = {
			MyNode: { outputs: [{ items: [{ val: 'wrong' }], outputIndex: 0 }] },
		};
		const requests: NockRequestRecord[] = [];
		const result = checkExpectations(
			{
				requests: { 'GET missing': { requestBody: {} } },
				nodes: { MyNode: { items: [{ val: 'right' }] } },
			},
			requests,
			nodeOutputs,
		);
		expect(result).toHaveLength(2);
		expect(result[0].path).toContain('requests');
		expect(result[1].path).toContain('nodes');
	});

	it('handles missing sections gracefully', () => {
		const result = checkExpectations({}, [], {});
		expect(result).toEqual([]);
	});

	it('handles only requests section', () => {
		const result = checkExpectations({ requests: {} }, [], {});
		expect(result).toEqual([]);
	});

	it('handles only nodes section', () => {
		const result = checkExpectations({ nodes: {} }, [], {});
		expect(result).toEqual([]);
	});
});
