import * as esprima from 'esprima-next';
import { walk } from './utils';

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
});
