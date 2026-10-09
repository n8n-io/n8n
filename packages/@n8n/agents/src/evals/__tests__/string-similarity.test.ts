import { stringSimilarity } from '../string-similarity';

describe('stringSimilarity', () => {
	const evalFn = stringSimilarity();

	describe('identical strings', () => {
		it('returns pass: true with 100% similarity for identical strings', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'hello world',
				expected: 'hello world',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toContain('100.0%');
		});

		it('is case-insensitive — mixed case matches', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'Hello World',
				expected: 'hello world',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toContain('100.0%');
		});

		it('trims whitespace before comparing', async () => {
			const result = await evalFn.run({
				input: '',
				output: '  hello world  ',
				expected: 'hello world',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toContain('100.0%');
		});
	});

	describe('similar but not identical strings', () => {
		it('returns pass: true when similarity >= 0.7', async () => {
			// "abcde" and "abcdf" share "ab","bc","cd" => 6/8 = 0.75
			const result = await evalFn.run({
				input: '',
				output: 'abcde',
				expected: 'abcdf',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toContain('75.0%');
		});

		it('returns pass: false when similarity < 0.7', async () => {
			// "abcde" and "abXde" share "ab","de" => 4/8 = 0.5
			const result = await evalFn.run({
				input: '',
				output: 'abcde',
				expected: 'abXde',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('50.0%');
		});
	});

	describe('edge cases', () => {
		it('returns pass: false when expected is undefined', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'anything',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected value provided');
		});

		it('matches identical single-character strings (similarity = 1)', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'a',
				expected: 'a',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toContain('100.0%');
		});

		it('returns 0 similarity for different single-character strings', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'a',
				expected: 'b',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('0.0%');
		});

		it('returns 0 similarity when one string has fewer than 2 characters', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'a',
				expected: 'ab',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('0.0%');
		});

		it('handles empty string output', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'hello',
			});
			expect(result.pass).toBe(false);
		});

		it('handles completely different strings', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'abcdef',
				expected: 'ghijkl',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('0.0%');
		});
	});
});
