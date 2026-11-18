import { describe, it, expect } from 'vitest';
import { isOversizedValue, isUnsafeNumberValue } from './columnUtils';
import { MAX_CELL_DISPLAY_LENGTH } from '@/features/core/dataTable/constants';

describe('columnUtils', () => {
	describe('isOversizedValue', () => {
		it('should return true for strings exceeding max length', () => {
			const longString = 'a'.repeat(MAX_CELL_DISPLAY_LENGTH + 1);
			expect(isOversizedValue(longString)).toBe(true);
		});

		it('should return false for strings within max length', () => {
			const shortString = 'a'.repeat(MAX_CELL_DISPLAY_LENGTH);
			expect(isOversizedValue(shortString)).toBe(false);
		});

		it('should return false for non-string values', () => {
			expect(isOversizedValue(12345)).toBe(false);
			expect(isOversizedValue(null)).toBe(false);
			expect(isOversizedValue(undefined)).toBe(false);
			expect(isOversizedValue({ key: 'value' })).toBe(false);
		});
	});

	describe('isUnsafeNumberValue', () => {
		it('should return false for non-number values', () => {
			expect(isUnsafeNumberValue('9007199254740993')).toBe(false);
			expect(isUnsafeNumberValue(null)).toBe(false);
			expect(isUnsafeNumberValue(undefined)).toBe(false);
			expect(isUnsafeNumberValue(true)).toBe(false);
		});

		it('should return false for numbers within the safe range', () => {
			expect(isUnsafeNumberValue(0)).toBe(false);
			expect(isUnsafeNumberValue(42)).toBe(false);
			expect(isUnsafeNumberValue(-42.5)).toBe(false);
			expect(isUnsafeNumberValue(Number.MAX_SAFE_INTEGER)).toBe(false);
			expect(isUnsafeNumberValue(-Number.MAX_SAFE_INTEGER)).toBe(false);
		});

		it('should return true for numbers beyond the safe range', () => {
			expect(isUnsafeNumberValue(Number.MAX_SAFE_INTEGER + 1)).toBe(true);
			expect(isUnsafeNumberValue(-(Number.MAX_SAFE_INTEGER + 1))).toBe(true);
			expect(isUnsafeNumberValue(1e20)).toBe(true);
		});

		it('should return true for non-finite numbers', () => {
			expect(isUnsafeNumberValue(Infinity)).toBe(true);
			expect(isUnsafeNumberValue(-Infinity)).toBe(true);
			expect(isUnsafeNumberValue(NaN)).toBe(true);
		});
	});
});
