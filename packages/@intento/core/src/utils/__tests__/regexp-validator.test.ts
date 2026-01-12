import { RegExpValidator } from '../regexp-validator';

/**
 * Tests for RegExpValidator utility class
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('RegExpValidator', () => {
	describe('business logic', () => {
		it('[BL-01] should return true for valid regex literal with flags', () => {
			// ARRANGE
			const pattern = '/[a-z]+/gi';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(true);
		});

		it('[BL-02] should return true for valid regex literal without flags', () => {
			// ARRANGE
			const pattern = '/test/';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(true);
		});

		it('[BL-03] should return true for complex regex patterns', () => {
			// ARRANGE
			const patterns = ['/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/i', '/\\d{3}-\\d{2}-\\d{4}/', '/(https?:\\/\\/[^\\s]+)/g'];

			// ACT & ASSERT
			patterns.forEach((pattern) => {
				expect(RegExpValidator.isValidPattern(pattern)).toBe(true);
			});
		});

		it('[BL-04] should return true for regex with escaped forward slashes', () => {
			// ARRANGE
			const pattern = '/path\\/to\\/file/';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(true);
		});

		it('[BL-05] should return true for regex with all valid flags', () => {
			// ARRANGE
			const pattern = '/test/gimusy';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should return false for plain string without delimiters', () => {
			// ARRANGE
			const pattern = 'test';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EC-02] should return false for empty pattern (//)', () => {
			// ARRANGE
			const pattern = '//';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EC-03] should return false for pattern with only opening slash', () => {
			// ARRANGE
			const pattern = '/test';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EC-04] should return false for pattern with only closing slash', () => {
			// ARRANGE
			const pattern = 'test/';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EC-05] should return false for pattern with invalid flags', () => {
			// ARRANGE
			const patterns = ['/test/x', '/test/gg', '/test/a'];

			// ACT & ASSERT
			patterns.forEach((pattern) => {
				expect(RegExpValidator.isValidPattern(pattern)).toBe(false);
			});
		});

		it('[EC-06] should return false for empty string input', () => {
			// ARRANGE
			const pattern = '';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EC-07] should return false for pattern with spaces in flags', () => {
			// ARRANGE
			const pattern = '/test/g i';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should return false for unclosed bracket in pattern', () => {
			// ARRANGE
			const pattern = '/[a-z/';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EH-02] should return false for invalid character class range', () => {
			// ARRANGE
			const pattern = '/[z-a]/';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});

		it('[EH-03] should return false for unmatched parentheses', () => {
			// ARRANGE
			const patterns = ['/(abc/', '/abc)/'];

			// ACT & ASSERT
			patterns.forEach((pattern) => {
				expect(RegExpValidator.isValidPattern(pattern)).toBe(false);
			});
		});

		it('[EH-04] should return false for invalid quantifier', () => {
			// ARRANGE
			const patterns = ['/+test/', '/*test/', '/test++/'];

			// ACT & ASSERT
			patterns.forEach((pattern) => {
				expect(RegExpValidator.isValidPattern(pattern)).toBe(false);
			});
		});

		it('[EH-05] should return false for invalid flags', () => {
			// ARRANGE
			const pattern = '/test/xyz';

			// ACT
			const result = RegExpValidator.isValidPattern(pattern);

			// ASSERT
			expect(result).toBe(false);
		});
	});
});
