import { Tournament } from '@n8n/tournament';
import { describe, it, expect } from 'vitest';

/**
 * On this branch `@n8n/tournament` is an external dependency, patched through
 * `patches/@n8n__tournament@1.9.1.patch`, so the package's own suite is not available to
 * run. These cases cover the patched code generation from the consumer side instead.
 */
const evaluator = new Tournament((e) => {
	throw e;
});

const BOGUS = 'BOGUS_STRINGIFY_OUTPUT';

const withBogusStringify = <T>(fn: () => T): T => {
	const original = JSON.stringify;
	try {
		JSON.stringify = (() => BOGUS) as unknown as typeof JSON.stringify;
		return fn();
	} finally {
		JSON.stringify = original;
	}
};

describe('generated code', () => {
	it('generates identifier code independent of the global JSON.stringify', () => {
		const [pristine] = evaluator.getExpressionCode('{{ someFreeName }}');
		expect(pristine).toContain('"someFreeName"');

		const [generated] = withBogusStringify(() =>
			evaluator.getExpressionCode('{{ anotherFreeName }}'),
		);

		expect(generated).not.toContain(BOGUS);
		expect(generated).toBe(pristine.replace(/someFreeName/g, 'anotherFreeName'));
	});

	it('renders text chunks and the join separator independent of the global JSON.stringify', () => {
		const [pristine] = evaluator.getExpressionCode('prefix {{ value }}');
		expect(pristine).toContain('["prefix "');
		expect(pristine).toContain('].join("")');

		const [generated] = withBogusStringify(() => evaluator.getExpressionCode('prefix {{ value }}'));

		// The text chunk and join separator render verbatim; neither is routed
		// through the global.
		expect(generated).toContain('["prefix "');
		expect(generated).toContain('].join("")');
		expect(generated).not.toContain(BOGUS);
	});

	it.each([
		['a line separator', '\u2028'],
		['a paragraph separator', '\u2029'],
	])('escapes %s in a text chunk, so the literal stays single-line', (_, separator) => {
		const [generated] = evaluator.getExpressionCode(`a${separator}b {{ 1 }}`);

		expect(generated).not.toContain(separator);
	});

	it.each([
		['a line separator', 'a\u2028b'],
		['a paragraph separator', 'a\u2029b'],
		['quotes, a backslash and a newline', 'he said "hi"\\\n\ttab'],
	])('round-trips text chunks containing %s', (_, text) => {
		expect(evaluator.execute(`${text} {{ 1 }}`, {})).toBe(`${text} 1`);
	});
});
