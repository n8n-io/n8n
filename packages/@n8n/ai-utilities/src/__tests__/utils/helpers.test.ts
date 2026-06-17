import { hasLongSequentialRepeat } from 'src/utils/helpers';

describe('hasLongSequentialRepeat', () => {
	it('should return false for text shorter than threshold', () => {
		const text = 'a'.repeat(99);
		expect(hasLongSequentialRepeat(text, 100)).toBe(false);
	});

	it('should return false for normal text without repeats', () => {
		const text = 'This is a normal text without many sequential repeating characters.';
		expect(hasLongSequentialRepeat(text)).toBe(false);
	});

	it('should return true for text with exactly threshold repeats', () => {
		const text = 'a'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should return true for text with more than threshold repeats', () => {
		const text = 'b'.repeat(150);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should detect repeats in the middle of text', () => {
		const text = 'Normal text ' + 'x'.repeat(100) + ' more normal text';
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should detect repeats at the end of text', () => {
		const text = 'Normal text at the beginning' + 'z'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should work with different thresholds', () => {
		const text = 'a'.repeat(50);
		expect(hasLongSequentialRepeat(text, 30)).toBe(true);
		expect(hasLongSequentialRepeat(text, 60)).toBe(false);
	});

	it('should handle special characters', () => {
		const text = '.'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should handle spaces', () => {
		const text = ' '.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should handle newlines', () => {
		const text = '\n'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should not detect non-sequential repeats', () => {
		const text = 'ababab'.repeat(50); // 300 chars but no sequential repeats
		expect(hasLongSequentialRepeat(text, 100)).toBe(false);
	});

	it('should handle mixed content with repeats below threshold', () => {
		const text = 'aaa' + 'b'.repeat(50) + 'ccc' + 'd'.repeat(40) + 'eee';
		expect(hasLongSequentialRepeat(text, 100)).toBe(false);
	});

	it('should handle empty string', () => {
		expect(hasLongSequentialRepeat('', 100)).toBe(false);
	});

	it('should work with very large texts', () => {
		const normalText = 'Lorem ipsum dolor sit amet '.repeat(1000);
		const textWithRepeat = normalText + 'A'.repeat(100) + normalText;
		expect(hasLongSequentialRepeat(textWithRepeat, 100)).toBe(true);
	});

	it('should detect unicode character repeats', () => {
		const text = '😀'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	describe('error handling', () => {
		it('should handle null input', () => {
			expect(hasLongSequentialRepeat(null as unknown as string)).toBe(false);
		});

		it('should handle undefined input', () => {
			expect(hasLongSequentialRepeat(undefined as unknown as string)).toBe(false);
		});

		it('should handle non-string input', () => {
			expect(hasLongSequentialRepeat(123 as unknown as string)).toBe(false);
			expect(hasLongSequentialRepeat({} as unknown as string)).toBe(false);
			expect(hasLongSequentialRepeat([] as unknown as string)).toBe(false);
		});

		it('should handle zero or negative threshold', () => {
			const text = 'a'.repeat(100);
			expect(hasLongSequentialRepeat(text, 0)).toBe(false);
			expect(hasLongSequentialRepeat(text, -1)).toBe(false);
		});

		it('should handle empty string', () => {
			expect(hasLongSequentialRepeat('', 100)).toBe(false);
		});
	});
});
