import { ExpressionError } from 'n8n-workflow';
import {
	completeExpressionSyntax,
	isStringWithExpressionSyntax,
	removeExpressionPrefix,
	stringifyExpressionResult,
	unwrapExpression,
} from './expressions';

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

	describe('completeExpressionSyntax', () => {
		it('should complete expressions with "{{ " at the end', () => {
			expect(completeExpressionSyntax('test {{ ')).toBe('=test {{  }}');
		});

		it('should complete expressions with "{{$" at the end', () => {
			expect(completeExpressionSyntax('test {{$')).toBe('=test {{ $ }}');
		});

		it('should not modify already valid expressions', () => {
			expect(completeExpressionSyntax('=valid expression')).toBe('=valid expression');
		});

		it('should return non-string values unchanged', () => {
			expect(completeExpressionSyntax(123)).toBe(123);
			expect(completeExpressionSyntax(true)).toBe(true);
			expect(completeExpressionSyntax(null)).toBe(null);
		});
	});

	describe('isStringWithExpressionSyntax', () => {
		it('should return true for strings with expression syntax', () => {
			expect(isStringWithExpressionSyntax('test {{ value }}')).toBe(true);
		});

		it('should return false for strings without expression syntax', () => {
			expect(isStringWithExpressionSyntax('just a string')).toBe(false);
		});

		it('should return false for strings starting with "="', () => {
			expect(isStringWithExpressionSyntax('=expression {{ value }}')).toBe(false);
		});

		it('should return false for non-string values', () => {
			expect(isStringWithExpressionSyntax(123)).toBe(false);
			expect(isStringWithExpressionSyntax(true)).toBe(false);
			expect(isStringWithExpressionSyntax(null)).toBe(false);
		});
	});
});
