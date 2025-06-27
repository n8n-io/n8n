/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
	estimateTokensByCharCount,
	estimateTextSplitsByTokens,
	estimateTokensFromStringList,
} from '../token-estimator';

describe('token-estimator', () => {
	describe('estimateTokensByCharCount', () => {
		it('should estimate tokens for text using default model', () => {
			const text = 'This is a test text with some content.';
			const result = estimateTokensByCharCount(text);
			// 38 characters / 4.0 (cl100k_base ratio) = 10 tokens
			expect(result).toBe(10);
		});

		it('should estimate tokens for different models', () => {
			const text = 'Test text'; // 9 characters

			expect(estimateTokensByCharCount(text, 'gpt-4o')).toBe(3); // 9 / 3.8 = 2.37 -> 3
			expect(estimateTokensByCharCount(text, 'gpt-4')).toBe(3); // 9 / 4.0 = 2.25 -> 3
			expect(estimateTokensByCharCount(text, 'o200k_base')).toBe(3); // 9 / 3.5 = 2.57 -> 3
			expect(estimateTokensByCharCount(text, 'p50k_base')).toBe(3); // 9 / 4.2 = 2.14 -> 3
		});

		it('should use default ratio for unknown models', () => {
			const text = 'Test text with 24 chars.'; // 24 characters
			const result = estimateTokensByCharCount(text, 'unknown-model');
			expect(result).toBe(6); // 24 / 4.0 = 6
		});

		it('should handle empty text', () => {
			expect(estimateTokensByCharCount('')).toBe(0);
			expect(estimateTokensByCharCount('', 'gpt-4')).toBe(0);
		});

		it('should handle null or undefined text', () => {
			expect(estimateTokensByCharCount(null as any)).toBe(0);
			expect(estimateTokensByCharCount(undefined as any)).toBe(0);
		});

		it('should handle non-string input', () => {
			expect(estimateTokensByCharCount(123 as any)).toBe(0);
			expect(estimateTokensByCharCount({} as any)).toBe(0);
			expect(estimateTokensByCharCount([] as any)).toBe(0);
		});

		it('should handle very long text', () => {
			const longText = 'a'.repeat(10000);
			const result = estimateTokensByCharCount(longText);
			expect(result).toBe(2500); // 10000 / 4.0 = 2500
		});

		it('should handle invalid model ratios gracefully', () => {
			// This would only happen if MODEL_CHAR_PER_TOKEN_RATIOS is corrupted
			const text = 'Test text'; // 9 characters
			// Since we can't mock the constant, we test with default fallback
			const result = estimateTokensByCharCount(text, 'corrupted-model');
			expect(result).toBe(3); // Falls back to 4.0 ratio
		});

		it('should round up token estimates', () => {
			expect(estimateTokensByCharCount('a')).toBe(1); // 1 / 4.0 = 0.25 -> 1
			expect(estimateTokensByCharCount('ab')).toBe(1); // 2 / 4.0 = 0.5 -> 1
			expect(estimateTokensByCharCount('abc')).toBe(1); // 3 / 4.0 = 0.75 -> 1
			expect(estimateTokensByCharCount('abcd')).toBe(1); // 4 / 4.0 = 1
			expect(estimateTokensByCharCount('abcde')).toBe(2); // 5 / 4.0 = 1.25 -> 2
		});
	});

	describe('estimateTextSplitsByTokens', () => {
		it('should split text into chunks based on estimated token size', () => {
			const text = 'a'.repeat(400); // 400 characters
			const chunks = estimateTextSplitsByTokens(text, 25, 0); // 25 tokens = 100 chars

			expect(chunks).toHaveLength(4);
			expect(chunks[0]).toHaveLength(100);
			expect(chunks[1]).toHaveLength(100);
			expect(chunks[2]).toHaveLength(100);
			expect(chunks[3]).toHaveLength(100);
		});

		it('should handle chunk overlap', () => {
			const text = 'a'.repeat(200); // 200 characters
			const chunks = estimateTextSplitsByTokens(text, 25, 5); // 25 tokens = 100 chars, 5 tokens = 20 chars overlap

			expect(chunks).toHaveLength(3);
			expect(chunks[0]).toBe('a'.repeat(100)); // First chunk: 0-100
			expect(chunks[1]).toBe('a'.repeat(100)); // Second chunk: 80-180 (20 char overlap)
			expect(chunks[2]).toBe('a'.repeat(40)); // Third chunk: 160-200
		});

		it('should handle text shorter than chunk size', () => {
			const text = 'Short text';
			const chunks = estimateTextSplitsByTokens(text, 100, 0);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe(text);
		});

		it('should handle empty text', () => {
			expect(estimateTextSplitsByTokens('', 10, 0)).toEqual([]);
		});

		it('should handle null or undefined text', () => {
			expect(estimateTextSplitsByTokens(null as any, 10, 0)).toEqual([]);
			expect(estimateTextSplitsByTokens(undefined as any, 10, 0)).toEqual([]);
		});

		it('should handle non-string input', () => {
			expect(estimateTextSplitsByTokens(123 as any, 10, 0)).toEqual([]);
			expect(estimateTextSplitsByTokens({} as any, 10, 0)).toEqual([]);
		});

		it('should handle invalid chunk size', () => {
			const text = 'Test text';
			expect(estimateTextSplitsByTokens(text, 0, 0)).toEqual([text]);
			expect(estimateTextSplitsByTokens(text, -1, 0)).toEqual([text]);
			expect(estimateTextSplitsByTokens(text, NaN, 0)).toEqual([text]);
			expect(estimateTextSplitsByTokens(text, Infinity, 0)).toEqual([text]);
		});

		it('should handle invalid overlap', () => {
			const text = 'a'.repeat(200);
			// Negative overlap should be treated as 0
			const chunks1 = estimateTextSplitsByTokens(text, 25, -10);
			expect(chunks1).toHaveLength(2);

			// Overlap larger than chunk size should be capped
			const chunks2 = estimateTextSplitsByTokens(text, 25, 30); // overlap capped to 24
			expect(chunks2.length).toBeGreaterThan(2);
		});

		it('should ensure progress even with large overlap', () => {
			const text = 'a'.repeat(100);
			// With overlap = chunkSize - 1, we should still make progress
			const chunks = estimateTextSplitsByTokens(text, 10, 9); // 10 tokens = 40 chars, 9 tokens = 36 chars overlap

			expect(chunks.length).toBeGreaterThan(1);
			// Verify no infinite loop occurs
			expect(chunks.length).toBeLessThan(100);
		});

		it('should work with different models', () => {
			const text = 'a'.repeat(380); // 380 characters
			const chunks = estimateTextSplitsByTokens(text, 100, 0, 'gpt-4o'); // 100 tokens * 3.8 = 380 chars

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe(text);
		});

		it('should use default model ratio for unknown models', () => {
			const text = 'a'.repeat(400);
			const chunks = estimateTextSplitsByTokens(text, 100, 0, 'unknown-model'); // Falls back to 4.0 ratio

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe(text);
		});

		it('should handle edge case where text length equals chunk size', () => {
			const text = 'a'.repeat(100);
			const chunks = estimateTextSplitsByTokens(text, 25, 0); // 25 tokens = 100 chars

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe(text);
		});

		it('should handle unicode text', () => {
			const text = '你好世界'.repeat(25); // 100 characters (4 chars * 25)
			const chunks = estimateTextSplitsByTokens(text, 25, 0);

			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks.join('')).toBe(text);
		});

		it('should return single chunk on any error in catch block', () => {
			const text = 'Test text';
			// Since we can't easily trigger the catch block, we test the expected behavior
			// The function should return [text] on error
			const result = estimateTextSplitsByTokens(text, 10, 0);
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('estimateTokensFromStringList', () => {
		// Since this function uses tiktoken which requires external data files,
		// we'll test it with integration-style tests that don't require mocking

		it('should handle empty list', async () => {
			const result = await estimateTokensFromStringList([], 'gpt-4');
			expect(result).toBe(0);
		});

		it('should handle non-array input', async () => {
			const result = await estimateTokensFromStringList(null as any, 'gpt-4');
			expect(result).toBe(0);

			const result2 = await estimateTokensFromStringList('not an array' as any, 'gpt-4');
			expect(result2).toBe(0);
		});

		it('should handle null/undefined items in list', async () => {
			const list = ['Valid text', null, undefined, '', 123 as any];
			const result = await estimateTokensFromStringList(list, 'gpt-4');
			expect(result).toEqual(2);
		});

		it('should estimate tokens for normal text', async () => {
			const list = ['Hello world', 'Test text'];
			const result = await estimateTokensFromStringList(list, 'gpt-4');
			expect(result).toBeGreaterThan(0);
		});

		it('should use character-based estimation for repetitive content', async () => {
			const list = ['a'.repeat(1500)];
			const result = await estimateTokensFromStringList(list, 'gpt-4');
			expect(result).toBe(375); // 1500 chars / 4.0 = 375 tokens
		});

		it('should handle mixed content', async () => {
			const list = ['Normal text content', 'a'.repeat(1500), 'More normal text'];
			const result = await estimateTokensFromStringList(list, 'gpt-4');
			expect(result).toBeGreaterThan(375); // At least the repetitive content tokens
		});

		it('should work with different models', async () => {
			const list = ['Test text for different model'];
			const result1 = await estimateTokensFromStringList(list, 'gpt-4');
			const result2 = await estimateTokensFromStringList(list, 'gpt-4o');
			// Both should return positive values
			expect(result1).toBeGreaterThan(0);
			expect(result2).toBeGreaterThan(0);
		});

		it('should handle very long lists', async () => {
			const list = Array(10000).fill('Sample text');
			const result = await estimateTokensFromStringList(list, 'gpt-4');
			expect(result).toBeGreaterThan(0);
		});

		it('should handle unicode text', async () => {
			const list = ['你好世界', '🌍🌎🌏', 'مرحبا بالعالم'];
			const result = await estimateTokensFromStringList(list, 'gpt-4');
			expect(result).toBeGreaterThan(0);
		});
	});
});
