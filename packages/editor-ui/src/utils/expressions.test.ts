import { ExpressionError } from 'n8n-workflow';
import { removeExpressionPrefix, stringifyExpressionResult, unwrapExpression } from './expressions';

describe('Utils: Expressions', () => {
	describe('stringifyExpressionResult()', () => {
		it('should return empty string for non-critical errors', () => {
			expect(
				stringifyExpressionResult({
					ok: false,
					error: new ExpressionError('error message', { type: 'no_execution_data' }),
				}),
			).toEqual('');
		});

		it('should return an error message for critical errors', () => {
			expect(
				stringifyExpressionResult({
					ok: false,
					error: new ExpressionError('error message', { type: 'no_input_connection' }),
				}),
			).toEqual('[ERROR: No input connected]');
		});

		it('should return empty string when result is null', () => {
			expect(stringifyExpressionResult({ ok: true, result: null })).toEqual('');
		});

		it('should return NaN when result is NaN', () => {
			expect(stringifyExpressionResult({ ok: true, result: NaN })).toEqual('NaN');
		});

		it('should return [empty] message when result is empty string', () => {
			expect(stringifyExpressionResult({ ok: true, result: '' })).toEqual('[empty]');
		});

		it('should return the result when it is a string', () => {
			expect(stringifyExpressionResult({ ok: true, result: 'foo' })).toEqual('foo');
		});
	});

	describe('unwrapExpression', () => {
		it('should remove the brackets around an expression', () => {
			expect(unwrapExpression('{{ $json.foo }}')).toBe('$json.foo');
		});
	});

	describe('removeExpressionPrefix', () => {
		it.each([
			['=expression', 'expression'],
			['notAnExpression', 'notAnExpression'],
			[undefined, ''],
		])('turns "%s" into "%s"', (input, output) => {
			expect(removeExpressionPrefix(input)).toBe(output);
		});
	});
});
