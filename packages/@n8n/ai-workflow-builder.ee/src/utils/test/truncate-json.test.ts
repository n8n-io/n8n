import { MAX_EXECUTION_DATA_CHARS } from '../../constants';
import { truncateJson } from '../truncate-json';

describe('truncateJson', () => {
	describe('basic serialization', () => {
		it('should stringify simple objects', () => {
			const obj = { name: 'test', value: 123 };
			const result = truncateJson(obj);
			expect(result).toBe(JSON.stringify(obj, null, 2));
		});

		it('should stringify arrays', () => {
			const arr = [1, 2, 3, 'test'];
			const result = truncateJson(arr);
			expect(result).toBe(JSON.stringify(arr, null, 2));
		});

		it('should stringify primitive values', () => {
			expect(truncateJson('hello')).toBe('"hello"');
			expect(truncateJson(42)).toBe('42');
			expect(truncateJson(true)).toBe('true');
			expect(truncateJson(null)).toBe('null');
		});

		it('should stringify nested objects', () => {
			const nested = { a: { b: { c: 'deep' } } };
			const result = truncateJson(nested);
			expect(result).toBe(JSON.stringify(nested, null, 2));
		});
	});

	describe('truncation', () => {
		it('should truncate strings exceeding maxLength', () => {
			const largeObj = { data: 'x'.repeat(100) };
			const result = truncateJson(largeObj, { maxLength: 50 });

			expect(result.length).toBeLessThanOrEqual(50 + '\n... (truncated)'.length);
			expect(result).toContain('... (truncated)');
		});

		it('should not truncate strings within maxLength', () => {
			const smallObj = { name: 'test' };
			const result = truncateJson(smallObj, { maxLength: 1000 });

			expect(result).not.toContain('... (truncated)');
			expect(result).toBe(JSON.stringify(smallObj, null, 2));
		});

		it('should use MAX_EXECUTION_DATA_CHARS as default maxLength', () => {
			const largeObj = { data: 'x'.repeat(MAX_EXECUTION_DATA_CHARS + 100) };
			const result = truncateJson(largeObj);

			expect(result).toContain('... (truncated)');
		});

		it('should truncate at exact maxLength boundary', () => {
			const obj = { value: 'test' };
			const fullJson = JSON.stringify(obj, null, 2);
			const result = truncateJson(obj, { maxLength: fullJson.length });

			expect(result).toBe(fullJson);
			expect(result).not.toContain('... (truncated)');
		});

		it('should truncate when exceeding maxLength by one character', () => {
			const obj = { value: 'test' };
			const fullJson = JSON.stringify(obj, null, 2);
			const result = truncateJson(obj, { maxLength: fullJson.length - 1 });

			expect(result).toContain('... (truncated)');
		});
	});

	describe('indent option', () => {
		it('should use default indent of 2', () => {
			const obj = { a: 1 };
			const result = truncateJson(obj);
			expect(result).toBe(JSON.stringify(obj, null, 2));
		});

		it('should respect custom indent', () => {
			const obj = { a: 1 };
			const result = truncateJson(obj, { indent: 4 });
			expect(result).toBe(JSON.stringify(obj, null, 4));
		});

		it('should support no indent (0)', () => {
			const obj = { a: 1 };
			const result = truncateJson(obj, { indent: 0 });
			expect(result).toBe(JSON.stringify(obj, null, 0));
		});
	});

	describe('error handling', () => {
		it('should handle circular references gracefully', () => {
			const circular: Record<string, unknown> = { name: 'test' };
			circular.self = circular;

			const result = truncateJson(circular);
			expect(result).toBe('[Unable to serialize data]');
		});

		it('should handle BigInt values gracefully', () => {
			const obj = { big: BigInt(9007199254740991) };

			const result = truncateJson(obj);
			expect(result).toBe('[Unable to serialize data]');
		});

		it('should handle undefined values in objects', () => {
			const obj = { a: undefined, b: 'test' };
			const result = truncateJson(obj);
			// JSON.stringify omits undefined values
			expect(result).toBe(JSON.stringify(obj, null, 2));
		});
	});
});
