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
