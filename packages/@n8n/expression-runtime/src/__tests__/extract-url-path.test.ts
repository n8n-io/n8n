import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { createBridge, engineName } from './test-bridge';

const LONE_SURROGATE = String.fromCharCode(0xd83d);
const NUL = String.fromCharCode(0);

describe(`extractUrlPath (${engineName})`, () => {
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

	const extractUrlPath = (url: unknown) =>
		evaluator.evaluate('{{ extend($json.url, "extractUrlPath", []) }}', { $json: { url } }, caller);

	it.each([
		['https://de.wikipedia.org/wiki/Käse', '/wiki/K%C3%A4se'],
		['https://example.com/my report.pdf', '/my%20report.pdf'],
		['https://example.com/v1/../v2/users', '/v2/users'],
		['https://example.com/a%2fb', '/a%2fb'],
		['https://example.com', '/'],
		['custom://host', ''],
		['mailto:me@example.com', 'me@example.com'],
		[`https://example.com/a${NUL}b`, '/a%00b'],
		[`https://example.com/${LONE_SURROGATE}`, '/%EF%BF%BD'],
	])('should give the path of `new URL()` for %j', (url, path) => {
		expect(extractUrlPath(url)).toBe(path);
		expect(path).toBe(new URL(url).pathname);
	});

	it.each(['', 'hi', 'https://', 'https://exa mple.com/path'])(
		'should give no value for %j, which is not a valid URL',
		(url) => {
			expect(extractUrlPath(url)).toBeUndefined();
		},
	);
});
