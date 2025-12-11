import { describe, it, expect } from '@jest/globals';

import { splitByComma, parseRegex } from '../../helpers/common';

describe('common helper', () => {
	describe('splitByComma', () => {
		it('should split comma-separated string and trim whitespace', () => {
			const input = 'apple, banana, cherry, date';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
		});

		it('should handle strings with spaces around commas', () => {
			const input = 'apple , banana , cherry , date';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
		});

		it('should handle strings with mixed spacing', () => {
			const input = 'apple,  banana   ,cherry,  date  ';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
		});

		it('should filter out empty strings', () => {
			const input = 'apple,,banana, ,cherry,';
			const result = splitByComma(input);

			expect(result).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should handle empty string', () => {
			const input = '';
			const result = splitByComma(input);

			expect(result).toEqual([]);
		});

		it('should handle string with only commas and spaces', () => {
			const input = ' , , , ';
			const result = splitByComma(input);

			expect(result).toEqual([]);
		});

		it('should handle single item', () => {
			const input = 'apple';
			const result = splitByComma(input);

			expect(result).toEqual(['apple']);
		});

		it('should handle single item with spaces', () => {
			const input = '  apple  ';
			const result = splitByComma(input);

			expect(result).toEqual(['apple']);
		});

		it('should handle strings with special characters', () => {
			const input = 'test@example.com, user-name, value_with_underscore';
			const result = splitByComma(input);

			expect(result).toEqual(['test@example.com', 'user-name', 'value_with_underscore']);
		});

		it('should handle strings with numbers', () => {
			const input = '123, 456, 789';
			const result = splitByComma(input);

			expect(result).toEqual(['123', '456', '789']);
		});
	});

	describe('parseRegex', () => {
		it('should parse regex with forward slashes and flags', () => {
			const input = '/test/gi';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('test');
			expect(result.flags).toBe('gi');
		});

		it('should parse regex with forward slashes but no flags', () => {
			const input = '/test/';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('test');
			expect(result.flags).toBe('');
		});

		it('should parse regex with different flags', () => {
			const testCases = [
				{ input: '/pattern/g', expectedFlags: 'g' },
				{ input: '/pattern/i', expectedFlags: 'i' },
				{ input: '/pattern/m', expectedFlags: 'm' },
				{ input: '/pattern/u', expectedFlags: 'u' },
				{ input: '/pattern/s', expectedFlags: 's' },
				{ input: '/pattern/y', expectedFlags: 'y' },
				{ input: '/pattern/gim', expectedFlags: 'gim' },
			];

			testCases.forEach(({ input, expectedFlags }) => {
				const result = parseRegex(input);
				expect(result.source).toBe('pattern');
				expect(result.flags).toBe(expectedFlags);
			});
		});

		it('should handle regex with special characters', () => {
			const input = '/[a-z]+/gi';
			const result = parseRegex(input);

			expect(result.source).toBe('[a-z]+');
			expect(result.flags).toBe('gi');
		});

		it('should handle regex with escaped characters', () => {
			const input = '/\\d+/g';
			const result = parseRegex(input);

			expect(result.source).toBe('\\d+');
			expect(result.flags).toBe('g');
		});

		it('should handle regex with forward slashes in pattern', () => {
			const input = '/path\\/to\\/file/gi';
			const result = parseRegex(input);

			expect(result.source).toBe('path\\/to\\/file');
			expect(result.flags).toBe('gi');
		});

		it('should handle string without forward slashes as literal regex', () => {
			const input = 'test';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('test');
			expect(result.flags).toBe('');
		});

		it('should handle string with special characters without forward slashes', () => {
			const input = '[a-z]+';
			const result = parseRegex(input);

			expect(result.source).toBe('[a-z]+');
			expect(result.flags).toBe('');
		});

		it('should handle empty string', () => {
			const input = '';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('(?:)'); // Empty string becomes non-capturing group
			expect(result.flags).toBe('');
		});

		it('should handle null input', () => {
			const input = null as unknown as string;
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('(?:)'); // null becomes empty string, then non-capturing group
			expect(result.flags).toBe('');
		});

		it('should handle undefined input', () => {
			const input = undefined as unknown as string;
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('(?:)'); // undefined becomes empty string, then non-capturing group
			expect(result.flags).toBe('');
		});

		it('should handle malformed regex with only opening slash', () => {
			const input = '/test';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('\\/test'); // Forward slash gets escaped
			expect(result.flags).toBe('');
		});

		it('should handle malformed regex with only closing slash', () => {
			const input = 'test/';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('test\\/'); // Forward slash gets escaped
			expect(result.flags).toBe('');
		});

		it('should handle regex with empty pattern', () => {
			const input = '//g';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('(?:)'); // Empty pattern becomes non-capturing group
			expect(result.flags).toBe('g');
		});

		it('should handle regex with only slashes', () => {
			const input = '//';
			const result = parseRegex(input);

			expect(result).toBeInstanceOf(RegExp);
			expect(result.source).toBe('(?:)'); // Empty pattern becomes non-capturing group
			expect(result.flags).toBe('');
		});

		it('should handle complex regex patterns', () => {
			const input = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/i';
			const result = parseRegex(input);

			expect(result.source).toBe('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
			expect(result.flags).toBe('i');
		});
	});
});
