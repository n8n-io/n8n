import { MessageFormatter } from '../MessageFormatter';

describe('MessageFormatter', () => {
	describe('formatToolResult', () => {
		it('should format object result as JSON string in content array', () => {
			const result = { data: 'value', count: 42 };
			expect(MessageFormatter.formatToolResult(result)).toEqual({
				content: [{ type: 'text', text: '{"data":"value","count":42}' }],
			});
		});

		it('should format string result directly without double-quoting', () => {
			expect(MessageFormatter.formatToolResult('hello world')).toEqual({
				content: [{ type: 'text', text: 'hello world' }],
			});
		});

		it('should format number as string', () => {
			expect(MessageFormatter.formatToolResult(42)).toEqual({
				content: [{ type: 'text', text: '42' }],
			});
		});

		it('should format zero as string', () => {
			expect(MessageFormatter.formatToolResult(0)).toEqual({
				content: [{ type: 'text', text: '0' }],
			});
		});

		it('should format negative number as string', () => {
			expect(MessageFormatter.formatToolResult(-123)).toEqual({
				content: [{ type: 'text', text: '-123' }],
			});
		});

		it('should format float as string', () => {
			expect(MessageFormatter.formatToolResult(3.14159)).toEqual({
				content: [{ type: 'text', text: '3.14159' }],
			});
		});

		it('should format boolean true as string', () => {
			expect(MessageFormatter.formatToolResult(true)).toEqual({
				content: [{ type: 'text', text: 'true' }],
			});
		});

		it('should format boolean false as string', () => {
			expect(MessageFormatter.formatToolResult(false)).toEqual({
				content: [{ type: 'text', text: 'false' }],
			});
		});

		it('should format null as JSON string "null"', () => {
			expect(MessageFormatter.formatToolResult(null)).toEqual({
				content: [{ type: 'text', text: 'null' }],
			});
		});

		it('should format undefined as string "undefined"', () => {
			expect(MessageFormatter.formatToolResult(undefined)).toEqual({
				content: [{ type: 'text', text: 'undefined' }],
			});
		});

		it('should handle nested objects correctly', () => {
			const result = { outer: { inner: { deep: 'value' } } };
			const formatted = MessageFormatter.formatToolResult(result);
			expect(formatted.content[0].text).toBe(JSON.stringify(result));
		});

		it('should handle arrays', () => {
			const result = [1, 2, 3];
			expect(MessageFormatter.formatToolResult(result)).toEqual({
				content: [{ type: 'text', text: '[1,2,3]' }],
			});
		});

		it('should handle empty array', () => {
			expect(MessageFormatter.formatToolResult([])).toEqual({
				content: [{ type: 'text', text: '[]' }],
			});
		});

		it('should handle empty object', () => {
			expect(MessageFormatter.formatToolResult({})).toEqual({
				content: [{ type: 'text', text: '{}' }],
			});
		});

		it('should handle array of objects', () => {
			const result = [{ id: 1 }, { id: 2 }];
			const formatted = MessageFormatter.formatToolResult(result);
			expect(formatted.content[0].text).toBe(JSON.stringify(result));
		});

		it('should handle object with special characters in values', () => {
			const result = { message: 'Hello "world" with\nnewline' };
			const formatted = MessageFormatter.formatToolResult(result);
			expect(formatted.content[0].text).toBe(JSON.stringify(result));
		});

		it('should handle empty string result', () => {
			expect(MessageFormatter.formatToolResult('')).toEqual({
				content: [{ type: 'text', text: '' }],
			});
		});

		it('should handle string with unicode characters', () => {
			expect(MessageFormatter.formatToolResult('Hello')).toEqual({
				content: [{ type: 'text', text: 'Hello' }],
			});
		});
	});

	describe('isErrorResult', () => {
		it('should detect queue mode error objects with error.message', () => {
			expect(
				MessageFormatter.isErrorResult({ error: { message: 'Bad request', name: 'NodeApiError' } }),
			).toBe(true);
		});

		it('should detect queue mode error objects with just error.message', () => {
			expect(MessageFormatter.isErrorResult({ error: { message: 'something failed' } })).toBe(true);
		});

		it('should detect direct mode error strings from N8nTool toString()', () => {
			expect(
				MessageFormatter.isErrorResult('NodeApiError: Bad request - please check your parameters'),
			).toBe(true);
		});

		it('should detect HTTP error strings from ToolHttpRequest', () => {
			expect(MessageFormatter.isErrorResult('HTTP 401 There was an error: "Unauthorized"')).toBe(
				true,
			);
		});

		it('should detect generic error strings from ToolHttpRequest', () => {
			expect(MessageFormatter.isErrorResult('There was an error: "Token not found"')).toBe(true);
		});

		it('should detect TypeError strings', () => {
			expect(MessageFormatter.isErrorResult('TypeError: Cannot read property of undefined')).toBe(
				true,
			);
		});

		it('should not flag normal string results as errors', () => {
			expect(MessageFormatter.isErrorResult('Hello world')).toBe(false);
		});

		it('should not flag normal object results as errors', () => {
			expect(MessageFormatter.isErrorResult({ data: 'value', count: 42 })).toBe(false);
		});

		it('should not flag null/undefined as errors', () => {
			expect(MessageFormatter.isErrorResult(null)).toBe(false);
			expect(MessageFormatter.isErrorResult(undefined)).toBe(false);
		});

		it('should not flag numbers as errors', () => {
			expect(MessageFormatter.isErrorResult(42)).toBe(false);
		});

		it('should not flag empty string as error', () => {
			expect(MessageFormatter.isErrorResult('')).toBe(false);
		});
	});

	describe('formatToolResult with isError flag', () => {
		it('should set isError when flag is true', () => {
			const result = MessageFormatter.formatToolResult('There was an error: "Unauthorized"', true);
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toBe('There was an error: "Unauthorized"');
		});

		it('should not set isError when flag is false', () => {
			const result = MessageFormatter.formatToolResult('hello world', false);
			expect(result.isError).toBeUndefined();
		});

		it('should not set isError by default', () => {
			const result = MessageFormatter.formatToolResult('hello world');
			expect(result.isError).toBeUndefined();
		});

		it('should set isError for object results', () => {
			const errorObj = { error: { message: 'Bad request', name: 'NodeApiError' } };
			const result = MessageFormatter.formatToolResult(errorObj, true);
			expect(result.isError).toBe(true);
			expect(result.content[0].text).toBe(JSON.stringify(errorObj));
		});
	});

	describe('formatError', () => {
		it('should format error with isError flag set to true', () => {
			const error = new Error('Something went wrong');
			const result = MessageFormatter.formatError(error);

			expect(result.isError).toBe(true);
			expect(result.content[0].type).toBe('text');
			expect(result.content[0].text).toContain('Error: Something went wrong');
		});

		it('should handle error with empty message', () => {
			const error = new Error('');
			const result = MessageFormatter.formatError(error);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Error: ');
		});

		it('should handle error with special characters in message', () => {
			const error = new Error('Failed: "invalid" <value>');
			const result = MessageFormatter.formatError(error);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Error: Failed: "invalid" <value>');
		});

		it('should handle error with newlines in message', () => {
			const error = new Error('Line 1\nLine 2');
			const result = MessageFormatter.formatError(error);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Error: Line 1\nLine 2');
		});

		it('should handle TypeError', () => {
			const error = new TypeError('Cannot read property of undefined');
			const result = MessageFormatter.formatError(error);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('TypeError: Cannot read property of undefined');
		});

		it('should handle custom error subclass', () => {
			class CustomError extends Error {
				constructor(message: string) {
					super(message);
					this.name = 'CustomError';
				}
			}
			const error = new CustomError('Custom error message');
			const result = MessageFormatter.formatError(error);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('CustomError: Custom error message');
		});

		it('should include stack trace when available', () => {
			const error = new Error('Test error');
			const result = MessageFormatter.formatError(error);

			expect(result.content[0].text).toContain('Error: Test error');
			expect(result.content[0].text).toContain('at ');
		});
	});
});
