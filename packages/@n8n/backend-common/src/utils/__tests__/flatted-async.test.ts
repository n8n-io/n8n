import { parse, stringify } from 'flatted';

import { parseFlattedAsync } from '../flatted-async';

describe('parseFlattedAsync', () => {
	it('should parse simple objects', async () => {
		const original = { name: 'test', count: 42, active: true };
		const flattedString = stringify(original);
		const result = await parseFlattedAsync(flattedString);
		expect(result).toEqual(original);
	});

	it('should parse nested objects', async () => {
		const original = {
			node1: { data: [1, 2, 3], meta: { type: 'trigger' } },
			node2: { data: ['a', 'b'], meta: { type: 'action' } },
		};
		const flattedString = stringify(original);
		const result = await parseFlattedAsync(flattedString);
		expect(result).toEqual(original);
	});

	it('should handle circular references', async () => {
		const original: Record<string, unknown> = { name: 'root' };
		original.self = original;

		const flattedString = stringify(original);
		const result = await parseFlattedAsync(flattedString);

		expect((result as Record<string, unknown>).name).toBe('root');
		expect((result as Record<string, unknown>).self).toBe(result);
	});

	it('should handle arrays with circular references', async () => {
		const arr: unknown[] = [1, 2, 3];
		arr.push(arr);

		const flattedString = stringify(arr);
		const result = await parseFlattedAsync(flattedString);

		expect(Array.isArray(result)).toBe(true);
		const resultArr = result as unknown[];
		expect(resultArr[0]).toBe(1);
		expect(resultArr[1]).toBe(2);
		expect(resultArr[2]).toBe(3);
		expect(resultArr[3]).toBe(resultArr);
	});

	it('should handle null and primitive values', async () => {
		expect(await parseFlattedAsync(stringify(null))).toBeNull();
		expect(await parseFlattedAsync(stringify(42))).toBe(42);
		expect(await parseFlattedAsync(stringify('hello'))).toBe('hello');
		expect(await parseFlattedAsync(stringify(true))).toBe(true);
	});

	it('should handle empty objects and arrays', async () => {
		expect(await parseFlattedAsync(stringify({}))).toEqual({});
		expect(await parseFlattedAsync(stringify([]))).toEqual([]);
	});

	it('should produce the same result as flatted.parse for complex data', async () => {
		const original = {
			resultData: {
				runData: {
					Node1: [
						{
							startTime: 1234567890,
							executionTime: 100,
							data: { main: [[{ json: { id: 1, name: 'item1' } }]] },
						},
					],
					Node2: [
						{
							startTime: 1234567990,
							executionTime: 200,
							data: { main: [[{ json: { id: 2, name: 'item2', nested: { deep: true } } }]] },
						},
					],
				},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const flattedString = stringify(original);
		const syncResult = parse(flattedString);
		const asyncResult = await parseFlattedAsync(flattedString);

		expect(asyncResult).toEqual(syncResult);
	});

	it('should handle shared references between objects', async () => {
		const shared = { key: 'shared-value' };
		const original = { a: shared, b: shared };

		const flattedString = stringify(original);
		const result = (await parseFlattedAsync(flattedString)) as Record<string, unknown>;

		expect(result.a).toEqual(shared);
		expect(result.b).toEqual(shared);
		// flatted preserves reference identity
		expect(result.a).toBe(result.b);
	});

	it('should correctly parse large payloads', async () => {
		// Generate data large enough to exercise chunked streaming
		const items: Array<{ id: number; data: string }> = [];
		for (let i = 0; i < 5000; i++) {
			items.push({ id: i, data: `item-${i}-${'x'.repeat(1200)}` });
		}
		const original = { resultData: { runData: { Node1: [{ data: items }] } } };

		const flattedString = stringify(original);
		expect(flattedString.length).toBeGreaterThan(5 * 1024 * 1024);

		const syncResult = parse(flattedString);
		const asyncResult = await parseFlattedAsync(flattedString);

		expect(asyncResult).toEqual(syncResult);
	});
});
