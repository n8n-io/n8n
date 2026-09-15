import { categorization } from '../categorization';

describe('categorization', () => {
	const evalFn = categorization();

	describe('exact match', () => {
		it('returns pass: true when output exactly matches expected', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'positive',
				expected: 'positive',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('Exact match');
		});

		it('is case-insensitive for exact matches', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'Positive',
				expected: 'positive',
			});
			expect(result.pass).toBe(true);
		});

		it('trims whitespace before comparing', async () => {
			const result = await evalFn.run({
				input: '',
				output: '  positive  ',
				expected: 'positive',
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('contains match', () => {
		it('returns pass: true when output contains the expected label', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The sentiment is positive',
				expected: 'positive',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toContain('Output contains expected label');
		});

		it('returns pass: true when the label is embedded within a word', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'This is positively great',
				expected: 'positive',
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('no match', () => {
		it('returns pass: false when output does not match expected', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'negative',
				expected: 'positive',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('Expected');
			expect(result.reasoning).toContain('positive');
			expect(result.reasoning).toContain('negative');
		});

		it('returns pass: false for completely unrelated strings', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The sky is blue',
				expected: 'positive',
			});
			expect(result.pass).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('returns pass: false when expected is undefined', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'positive',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected category provided');
		});

		it('returns pass: false when expected is an empty string', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'positive',
				expected: '',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected category provided');
		});

		it('returns pass: false when output is empty but expected is not', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'positive',
			});
			expect(result.pass).toBe(false);
		});
	});
});
