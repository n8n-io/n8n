import { Tournament } from '../src/index';

const fnStub = () => {};

describe('ES6 Syntax', () => {
	let t: Tournament;

	beforeAll(() => {
		t = new Tournament(fnStub, '___n8n_data');
	});

	test('arrow functions', () => {
		const result = t.execute('{{ () => 1 }}', {});

		expect(result instanceof Function).toBe(true);
	});

	test('interpolation in template literals', () => {
		const result = t.execute('{{ `abc ${num} def` }}', { num: 123 });

		expect(result).toBe('abc 123 def');
	});

	test('template literal with new lines keeps text next to interpolations', () => {
		const result = t.execute('{{ `\nchk_${num}\n${name}_${num}\n` }}', { num: 123, name: 'John' });

		expect(result).toBe('\nchk_123\nJohn_123\n');
	});

	test('nested template literal with new lines', () => {
		const result = t.execute('{{ `a_${`\nb_${num}`}_c` }}', { num: 1 });

		expect(result).toBe('a_\nb_1_c');
	});

	describe.each([
		['on one line', (literal: string) => `{{ ${literal} }}`],
		['in a multi-line ternary', (literal: string) => `{{ x\n  ? ${literal}\n  : 'c' }}`],
	])('template literal values %s', (_, inExpression) => {
		const data = { x: 1, String };

		test.each([
			['a line continuation', '`a\\\n   b`', 'a   b'],
			['a line continuation after CRLF', '`a\\\r\n   b`', 'a   b'],
			['escapes next to a new line', '`q\\`b\\${x}c\\\\d\n   e`', 'q`b${x}c\\d\n   e'],
			['a value in parentheses before a new line', '`a${(x)}b\n   c`', 'a1b\n   c'],
			['a value in parentheses after a new line', '`a\n   ${(x)}b`', 'a\n   1b'],
			['String.raw with a new line', 'String.raw`a${x}\n   b\\n`', 'a1\n   b\\n'],
			['String.raw with a line continuation', 'String.raw`a\\\n   b`', 'a\\\n   b'],
			['String.raw with CRLF', 'String.raw`a\r\n   b`', 'a\n   b'],
		])('%s', (__, literal, expected) => {
			expect(t.execute(inExpression(literal), data)).toBe(expected);
		});

		test('a tag function gets one frozen strings array for each template', () => {
			const literal =
				'(() => { const tag = (s) => s; const r = [1, 2].map(() => tag`a\n  b`); return [r[0] === r[1], Object.isFrozen(r[0]), Object.isFrozen(r[0].raw), Object.keys(r[0])]; })()';

			expect(t.execute(inExpression(literal), { ...data, Object })).toEqual([
				true,
				true,
				true,
				['0'],
			]);
		});

		test('a tag function gets the cooked and raw strings and the values', () => {
			const literal = '((s, ...v) => [[...s], [...s.raw], v])`a\\\n  ${x}\n  b`';

			expect(t.execute(inExpression(literal), data)).toEqual([
				['a  ', '\n  b'],
				['a\\\n  ', '\n  b'],
				[1],
			]);
		});
	});

	test('spread operator', () => {
		const result = t.execute('{{ Math.max(...[1, 2, 3]) }}', {});

		expect(result).toBe(3);
	});
});
