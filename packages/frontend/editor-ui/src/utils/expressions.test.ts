import { ExpressionError } from 'n8n-workflow';
import {
	completeExpressionSyntax,
	shouldConvertToExpression,
	removeExpressionPrefix,
	stringifyExpressionResult,
	unwrapExpression,
} from './expressions';
import { executionRetryMessage } from './executionUtils';

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
			[4, 4],
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

		it('should return unchanged value if special editor type', () => {
			expect(completeExpressionSyntax('test {{ ', true)).toBe('test {{ ');
		});
	});

	describe('shouldConvertToExpression', () => {
		it('should return true for strings with expression syntax', () => {
			expect(shouldConvertToExpression('test {{ value }}')).toBe(true);
		});

		it('should return false for strings without expression syntax', () => {
			expect(shouldConvertToExpression('just a string')).toBe(false);
		});

		it('should return false for strings starting with "="', () => {
			expect(shouldConvertToExpression('=expression {{ value }}')).toBe(false);
		});

		it('should return false for non-string values', () => {
			expect(shouldConvertToExpression(123)).toBe(false);
			expect(shouldConvertToExpression(true)).toBe(false);
			expect(shouldConvertToExpression(null)).toBe(false);
		});

		it('should return false if special editor type', () => {
			expect(shouldConvertToExpression('test {{ value }}', true)).toBe(false);
		});
	});

	describe('executionRetryMessage', () => {
		it('returns success message for success status', () => {
			expect(executionRetryMessage('success')).toEqual({
				title: 'Retry successful',
				type: 'success',
			});
		});

		it('returns info message for waiting status', () => {
			expect(executionRetryMessage('waiting')).toEqual({
				title: 'Retry waiting',
				type: 'info',
			});
		});

		it('returns info message for running status', () => {
			expect(executionRetryMessage('running')).toEqual({
				title: 'Retry running',
				type: 'info',
			});
		});

		it('returns error message for crashed status', () => {
			expect(executionRetryMessage('crashed')).toEqual({
				title: 'Retry crashed',
				type: 'error',
			});
		});

		it('returns error message for canceled status', () => {
			expect(executionRetryMessage('canceled')).toEqual({
				title: 'Retry canceled',
				type: 'error',
			});
		});

		it('returns error message for error status', () => {
			expect(executionRetryMessage('error')).toEqual({
				title: 'Retry unsuccessful',
				type: 'error',
			});
		});

		it('returns undefined for an unknown status', () => {
			expect(executionRetryMessage('unknown')).toBeUndefined();
		});
	});
});
