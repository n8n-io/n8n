import * as esprima from 'esprima-next';
import { valueToInsert, walk } from './utils';

describe('CodeNodeEditor utils', () => {
	describe('walk', () => {
		it('should find the correct syntax nodes', () => {
			const code = `const x = 'a'
function f(arg) {
   arg['b'] = 1
   return arg
}

const y = f({ a: 'c' })
`;
			const program = esprima.parse(code);
			const stringLiterals = walk(
				program,
				(node) => node.type === esprima.Syntax.Literal && typeof node.value === 'string',
			);
			expect(stringLiterals).toEqual([
				new esprima.Literal('a', "'a'"),
				new esprima.Literal('b', "'b'"),
				new esprima.Literal('c', "'c'"),
			]);
		});

		it('should handle null syntax nodes', () => {
			// ,, in [1,,2] results in a `null` ArrayExpressionElement
			const code = 'const fn = () => [1,,2]';
			const program = esprima.parse(code);
			const arrayExpressions = walk(
				program,
				(node) => node.type === esprima.Syntax.ArrayExpression,
			);
			expect(arrayExpressions).toEqual([
				new esprima.ArrayExpression([
					new esprima.Literal(1, '1'),
					null,
					new esprima.Literal(2, '2'),
				]),
			]);
		});
	});

	describe('valueToInsert', () => {
		describe('JavaScript', () => {
			it('should convert input item correctly, runOnceForAllItems', () => {
				expect(
					valueToInsert('{{ $json.foo.bar[0].baz }}', 'javaScript', 'runOnceForAllItems'),
				).toBe('{{ $input.first().json.foo.bar[0].baz }}');
			});

			it('should convert input item correctly, runOnceForEachItem', () => {
				expect(
					valueToInsert('{{ $json.foo.bar[0].baz }}', 'javaScript', 'runOnceForEachItem'),
				).toBe('{{ $json.foo.bar[0].baz }}');
			});

			it('should convert previous node correctly, runOnceForAllItems', () => {
				expect(
					valueToInsert(
						"{{ $('Some Previous Node').item.json.foo.bar[0].baz }}",
						'javaScript',
						'runOnceForAllItems',
					),
				).toBe("{{ $('Some Previous Node').first().json.foo.bar[0].baz }}");
			});

			it('should convert previous node correctly, runOnceForEachItem', () => {
				expect(
					valueToInsert(
						"{{ $('Some Previous Node').item.json.foo.bar[0].baz }}",
						'javaScript',
						'runOnceForEachItem',
					),
				).toBe("{{ $('Some Previous Node').item.json.foo.bar[0].baz }}");
			});
		});

		describe('Python (Pyodide)', () => {
			it('should convert input item correctly, runOnceForAllItems', () => {
				expect(valueToInsert('{{ $json.foo.bar[0].baz }}', 'python', 'runOnceForAllItems')).toBe(
					'{{ _input.first().json.foo.bar[0].baz }}',
				);
			});

			it('should convert input item correctly, runOnceForEachItem', () => {
				expect(valueToInsert('{{ $json.foo.bar[0].baz }}', 'python', 'runOnceForEachItem')).toBe(
					'{{ _input.item.json.foo.bar[0].baz }}',
				);
			});

			it('should convert previous node correctly, runOnceForAllItems', () => {
				expect(
					valueToInsert(
						"{{ $('Some Previous Node').item.json.foo.bar[0].baz }}",
						'python',
						'runOnceForAllItems',
					),
				).toBe("{{ _('Some Previous Node').first().json.foo.bar[0].baz }}");
			});

			it('should convert previous node correctly, runOnceForEachItem', () => {
				expect(
					valueToInsert(
						"{{ $('Some Previous Node').item.json.foo.bar[0].baz }}",
						'python',
						'runOnceForEachItem',
					),
				).toBe("{{ _('Some Previous Node').item.json.foo.bar[0].baz }}");
			});
		});

		describe('Python (Native)', () => {
			it('should convert input item correctly, runOnceForAllItems', () => {
				expect(
					valueToInsert('{{ $json.foo.bar[0].baz }}', 'pythonNative', 'runOnceForAllItems'),
				).toBe('{{ _items[0]["json"]["foo"]["bar"][0]["baz"] }}');
			});

			it('should convert input item correctly, runOnceForEachItem', () => {
				expect(
					valueToInsert('{{ $json.foo.bar[0].baz }}', 'pythonNative', 'runOnceForEachItem'),
				).toBe('{{ _item["json"]["foo"]["bar"][0]["baz"] }}');
			});
		});
	});
});
