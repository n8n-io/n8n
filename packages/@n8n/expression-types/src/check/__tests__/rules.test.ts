import ts from 'typescript';

import { addedFieldReads, findingOf, sandboxRuleIssues } from '../rules';
import { shadowOf, type ExpressionSpan } from '../shadow';

const scope = {
	globals: { item: ['$json', '$'], code: ['$json', 'items'] },
	trailer: '',
};

function spanOf(source: string, needle: string, kind?: 'code'): ExpressionSpan {
	const start = source.indexOf(needle);
	const end = start + needle.length;
	return { start, end, literalStart: start, literalEnd: end, text: needle.slice(1, -1), kind };
}

const parse = (text: string) =>
	ts.createSourceFile('shadow.ts', text, ts.ScriptTarget.ES2022, true);

describe('findingOf', () => {
	const source = "f({ a: '={{ x.y }}', jsCode: 'o.n = 1; return o.n + q + r.s;' });";
	const shadow = shadowOf(
		source,
		[spanOf(source, "'={{ x.y }}'"), spanOf(source, "'o.n = 1; return o.n + q + r.s;'", 'code')],
		scope,
	);
	const at = (needle: string, from = 0) => shadow.text.indexOf(needle, from);

	it('keeps expression errors and drops untyped callback parameters', () => {
		expect(findingOf(shadow, { pos: at('x.y'), code: 2304 }, new Set())?.start).toBe(
			source.indexOf('x.y'),
		);
		expect(findingOf(shadow, { pos: at('x.y'), code: 7006 }, new Set())).toBeUndefined();
	});

	it('keeps only bug-class errors in Code, and not the read of a field that the code adds', () => {
		const read = at('n +');
		const reads = addedFieldReads(ts, parse(shadow.text), shadow.text);

		expect(reads.has(read)).toBe(true);
		expect(findingOf(shadow, { pos: read, code: 2339 }, reads)).toBeUndefined();
		expect(findingOf(shadow, { pos: at('q +'), code: 2304 }, reads)?.start).toBe(
			source.indexOf('q +'),
		);
		expect(findingOf(shadow, { pos: at('r.s'), code: 2322 }, reads)).toBeUndefined();
	});
});

describe('sandboxRuleIssues', () => {
	it('reports n8n sandbox rules inside expressions only', () => {
		const source =
			"f({ a: '={{ $json.constructor }}', b: '={{ $ }}', c: '={{ $json.__proto__ }}', jsCode: 'x.constructor' });";
		const shadow = shadowOf(
			source,
			[
				spanOf(source, "'={{ $json.constructor }}'"),
				spanOf(source, "'={{ $ }}'"),
				spanOf(source, "'={{ $json.__proto__ }}'"),
				spanOf(source, "'x.constructor'", 'code'),
			],
			scope,
		);

		expect(sandboxRuleIssues(ts, parse(shadow.text), shadow)).toEqual([
			{
				start: source.indexOf('constructor'),
				message:
					"Expression contains invalid constructor function call. n8n rejects any '.constructor' access.",
			},
			{
				start: source.indexOf('$ }}'),
				message: 'Cannot access "$" without calling it as a function.',
			},
			{
				start: source.indexOf('__proto__'),
				message: 'n8n blocks prototype access in expressions.',
			},
		]);
	});
});
