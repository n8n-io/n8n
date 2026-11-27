import { createHash } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { createBridge, engineName, newBridge } from './test-bridge';

describe(`libraries that load at the first call (${engineName})`, () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({ createBridge, maxCodeCacheSize: 64 });
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	const hash = (text: string, algorithm?: string) =>
		evaluator.evaluate(
			'{{ extend($json.text, "hash", $json.args) }}',
			{ $json: { text, args: algorithm ? [algorithm] : [] } },
			caller,
		);

	it.each(['md5', 'sha1', 'sha256', 'sha512'])('should hash a string with %s', (algorithm) => {
		const expected = createHash(algorithm).update('n8n').digest('hex');

		expect(hash('n8n', algorithm)).toBe(expected);
		expect(hash('n8n', algorithm)).toBe(expected);
	});

	it('should hash a string with md5 when no algorithm is given', () => {
		expect(hash('n8n')).toBe(createHash('md5').update('n8n').digest('hex'));
	});

	it('should run a jmespath query', () => {
		const data = { users: [{ name: 'a' }, { name: 'b' }] };

		expect(
			evaluator.evaluate('{{ $jmespath($json, "users[*].name") }}', { $json: data }, caller),
		).toEqual(['a', 'b']);
		expect(
			evaluator.evaluate('{{ $jmespath($json, "users[1].name") }}', { $json: data }, caller),
		).toBe('b');
	});

	const callOnArray = (items: unknown[], method: string, args: unknown[] = []) =>
		evaluator.evaluate(
			`{{ extend($json.items, "${method}", $json.args) }}`,
			{ $json: { items, args } },
			caller,
		);

	it('should remove deeply equal items with unique', () => {
		expect(callOnArray([{ a: [1] }, { a: [1] }, { a: [2] }], 'unique')).toEqual([
			{ a: [1] },
			{ a: [2] },
		]);
	});

	it.each([
		['union', [{ a: 1 }, { a: 2 }, { a: 3 }]],
		['difference', [{ a: 1 }]],
		['intersection', [{ a: 2 }]],
	])('should compare items deeply with %s', (method, expected) => {
		expect(callOnArray([{ a: 1 }, { a: 2 }], method, [[{ a: 2 }, { a: 3 }]])).toEqual(expected);
	});

	it('should pick an item of the array with randomItem', () => {
		expect(['a', 'b', 'c']).toContain(callOnArray(['a', 'b', 'c'], 'randomItem'));
	});

	it('should load a library again after a timeout stopped its first load', async () => {
		const bridge = newBridge({ timeout: 200 });
		try {
			await bridge.initialize();
			const unique = 'return extend([1, 1, 2], "unique", [])';
			// lodash reads the `self` global during its setup.
			bridge.execute(
				'Object.defineProperty(globalThis, "self", { configurable: true, get() { for (;;) {} } }); return 0',
				{},
			);

			expect(() => bridge.execute(unique, {})).toThrow('timed out');
			bridge.execute('delete globalThis.self; return 0', {});

			expect(bridge.execute(unique, {})).toEqual([1, 2]);
		} finally {
			await bridge.dispose();
		}
	});
});
