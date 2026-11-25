import { Tournament } from '../src/index';
import { FunctionEvaluator } from '../src/FunctionEvaluator';
import { testExpressionsWithEvaluator } from './utils';

const evaluator = new Tournament(() => {});

describe('Expression', () => {
	describe('Test all expression evaluation fixtures', () => {
		testExpressionsWithEvaluator(FunctionEvaluator);
	});

	test('Should throw error when using import', () => {
		expect(() =>
			evaluator.execute('{{ import("").then(fs => fs.writeFileSync("/tmp/flag", "flag")) }}', {}),
		).toThrow('Imports are not supported');
	});

	test('Should unescape every escaped closing bracket', () => {
		expect(evaluator.execute('{{ [{ a: { b: 1 \\}}, { a: { b: 2 \\}}][1].a.b }}', {})).toBe(2);
	});

	test.each([
		['a line feed', '\n'],
		['a carriage return and line feed', '\r\n'],
		['a carriage return', '\r'],
		['a line separator', '\u2028'],
	])('Should keep string literal values that continue the line after %s', (_, eol) => {
		const literal = `'a\\${eol}\\${eol}   b'`;

		expect(evaluator.execute(`{{ ${literal} }}`, {})).toBe('a   b');
		expect(evaluator.execute(`{{ x\n  ? ${literal}\n  : 'c' }}`, { x: true })).toBe('a   b');
		expect(evaluator.execute(`{{ f(\n        ${literal}) }}`, { f: (v: string) => v })).toBe(
			'a   b',
		);
	});

	test('Should not turn a string with a line continuation into a directive', () => {
		const expression =
			"{{ (function () { 'use\\\n strict'; return this === undefined; }).call() }}";

		expect(evaluator.execute(expression, {})).toBe(false);
	});

	test('Should keep identifiers that are written with escapes next to a multi-line string', () => {
		const expression =
			"{{ ['a\\\nb', \\u005f_n8n_literal_text_0_0__, \\u005f_n8n_literal_text_1_0__] }}";
		const data = { __n8n_literal_text_0_0__: 'first', __n8n_literal_text_1_0__: 'second' };

		expect(evaluator.execute(expression, data)).toEqual(['ab', 'first', 'second']);
	});

	test('Should keep strings that look like the tokens for multi-line strings', () => {
		const longLookalike = `__n8n_literal_text_${'_'.repeat(100_000)}`;
		const lookalike = '__n8n_literal_text_0_0__';

		expect(evaluator.execute(`{{ ['a\\\nb', '${longLookalike}'] }}`, {})).toEqual([
			'ab',
			longLookalike,
		]);
		expect(evaluator.execute(`{{ ['a\\\nb', '${lookalike}'] }}`, {})).toEqual(['ab', lookalike]);
	});

	test.each([
		[
			'{{ $json.name }}',
			'var global = {};\nvar ___n8n_data = this;\n\ntry {\n    return ("$json" in ___n8n_data ? ___n8n_data : global).$json.name;\n} catch (e) {\n    E(e, this);\n}',
		],
		[
			'Hello {{ $json.name }}!',
			'var global = {};\nvar ___n8n_data = this;\n\nreturn ["Hello ", function(v) {\n    try {\n        v = ("$json" in ___n8n_data ? ___n8n_data : global).$json.name;\n    } catch (e) {\n        E(e, this);\n    }\n\n    ;\n    return v || v === 0 || v === false ? v : "";\n}.call(this), "!"].join("");',
		],
		[
			"{{ `a` + x + 'c\\nd' }}",
			'var global = {};\nvar ___n8n_data = this;\n\ntry {\n    return `a` + ("x" in ___n8n_data ? ___n8n_data : global).x + \'c\\nd\';\n} catch (e) {\n    E(e, this);\n}',
		],
	])('Should keep the generated code of the one-line expression %s', (expression, code) => {
		expect(evaluator.getExpressionCode(expression)[0]).toBe(code);
	});

	test('Should keep a data node name that looks like the token for a multi-line string', () => {
		const customEvaluator = new Tournament(() => {}, '__n8n_literal_text_0_0__');

		expect(customEvaluator.execute("{{ x\n  ? 'a\\\nb'\n  : 'c' }}", { x: true })).toBe('ab');
	});
});
