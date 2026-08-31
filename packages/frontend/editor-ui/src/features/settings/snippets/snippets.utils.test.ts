import { parseSnippetSignature } from './snippets.utils';

describe('parseSnippetSignature', () => {
	it.each([
		['(n) => n * 2', true, ['n']],
		['(a, b) => a + b', true, ['a', 'b']],
		['n => n * 2', true, ['n']],
		['() => 42', true, []],
		['(a = 1, b) => a + b', true, ['a', 'b']],
		['function (x, y) { return x + y }', true, ['x', 'y']],
		['function named(x) { return x }', true, ['x']],
		['0.19', false, []],
		["{ key: 'value' }", false, []],
		["'constant'", false, []],
	])('parses %s', (source, isFunction, argNames) => {
		const signature = parseSnippetSignature(source);
		expect(signature.isFunction).toBe(isFunction);
		expect(signature.args.map((arg) => arg.name)).toEqual(argNames);
	});
});
