/**
 * Test suite for uid utility function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uid } from '../uid';

describe('uid', () => {
	let mathRandomSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mathRandomSpy = vi.spyOn(Math, 'random');
	});

	afterEach(() => {
		mathRandomSpy.mockRestore();
	});

	describe('Basic Functionality', () => {
		it('should generate a random uid without base id', () => {
			mathRandomSpy.mockReturnValue(0.123456789);
			const result = uid();

			expect(result).toBe('4fzzzxjyl');
			expect(result).toHaveLength(9); // 9 chars after decimal
		});

		it('should generate a random uid with base id', () => {
			mathRandomSpy.mockReturnValue(0.987654321);
			const result = uid('test');

			expect(result).toBe('test-zk00000yt');
			expect(result.startsWith('test-')).toBe(true);
		});

		it('should generate different uids on consecutive calls', () => {
			mathRandomSpy.mockReturnValueOnce(0.123456789);
			mathRandomSpy.mockReturnValueOnce(0.987654321);

			const uid1 = uid();
			const uid2 = uid();

			expect(uid1).not.toBe(uid2);
		});
	});

	describe('Base ID Handling', () => {
		it('should handle empty string base id', () => {
			mathRandomSpy.mockReturnValue(0.5);
			const result = uid('');

			expect(result).toBe('i');
			expect(result.startsWith('-')).toBe(false);
		});

		it('should handle numeric base id', () => {
			mathRandomSpy.mockReturnValue(0.5);
			const result = uid('123');

			expect(result).toBe('123-i');
			expect(result.startsWith('123-')).toBe(true);
		});

		it('should handle special characters in base id', () => {
			mathRandomSpy.mockReturnValue(0.5);
			const result = uid('test-with-dashes_and_underscores');

			expect(result).toBe('test-with-dashes_and_underscores-i');
			expect(result.startsWith('test-with-dashes_and_underscores-')).toBe(true);
		});

		it('should handle very long base id', () => {
			mathRandomSpy.mockReturnValue(0.5);
			const longBaseId = 'a'.repeat(100);
			const result = uid(longBaseId);

			expect(result).toBe(`${longBaseId}-i`);
			expect(result.startsWith(`${longBaseId}-`)).toBe(true);
		});
	});

	describe('Random Value Handling', () => {
		it('should handle minimum random value', () => {
			mathRandomSpy.mockReturnValue(0.0);
			const result = uid();

			expect(result).toBe('');
			expect(result).toHaveLength(0);
		});

		it('should handle maximum random value', () => {
			mathRandomSpy.mockReturnValue(0.9999999999);
			const result = uid();

			expect(result).toBe('zzzzzzs5w');
			expect(result).toHaveLength(9);
		});

		it('should handle edge case random values', () => {
			const edgeCases = [0.1, 0.01, 0.001, 0.0001, 0.99, 0.999];

			edgeCases.forEach((randomValue) => {
				mathRandomSpy.mockReturnValueOnce(randomValue);
				const result = uid('edge');

				expect(result.startsWith('edge-')).toBe(true);
				expect(result.length).toBeGreaterThan(5); // 'edge-' + at least 1 char
			});
		});
	});

	describe('Format and Structure', () => {
		it('should only contain valid base36 characters', () => {
			mathRandomSpy.mockReturnValue(0.123456789);
			const result = uid();

			const base36Regex = /^[0-9a-z]+$/;
			expect(base36Regex.test(result)).toBe(true);
		});

		it('should maintain consistent format with base id', () => {
			mathRandomSpy.mockReturnValue(0.123456789);
			const result = uid('prefix');

			const formatRegex = /^prefix-[0-9a-z]+$/;
			expect(formatRegex.test(result)).toBe(true);
		});

		it('should extract 9 characters after decimal point', () => {
			mathRandomSpy.mockReturnValue(0.123456789012345);
			const result = uid();

			// Should be exactly 9 chars from position 2 to 11 in base36 string
			const expected = (0.123456789012345).toString(36).substring(2, 11);
			expect(result).toBe(expected);
		});

		it('should handle case where random generates less than 9 characters', () => {
			mathRandomSpy.mockReturnValue(0.1);
			const result = uid();

			// 0.1 in base36 should be shorter
			const expected = (0.1).toString(36).substring(2, 11);
			expect(result).toBe(expected);
			expect(result.length).toBeLessThanOrEqual(9);
		});
	});

	describe('Real World Usage', () => {
		it('should generate unique ids for form inputs', () => {
			const inputIds = Array.from({ length: 10 }, () => uid('input'));
			const uniqueIds = new Set(inputIds);

			expect(uniqueIds.size).toBe(10); // All should be unique
			inputIds.forEach((id) => {
				expect(id.startsWith('input-')).toBe(true);
			});
		});

		it('should generate unique ids for components', () => {
			const componentIds = Array.from({ length: 5 }, () => uid('component'));
			const uniqueIds = new Set(componentIds);

			expect(uniqueIds.size).toBe(5); // All should be unique
			componentIds.forEach((id) => {
				expect(id.startsWith('component-')).toBe(true);
			});
		});

		it('should work without base id for simple unique ids', () => {
			const simpleIds = Array.from({ length: 5 }, () => uid());
			const uniqueIds = new Set(simpleIds);

			expect(uniqueIds.size).toBe(5); // All should be unique
			simpleIds.forEach((id) => {
				expect(id.length).toBeGreaterThan(0);
				expect(!id.includes('-')).toBe(true); // No dash when no base id
			});
		});
	});
});
