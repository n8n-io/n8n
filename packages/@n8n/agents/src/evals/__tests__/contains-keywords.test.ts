import { containsKeywords } from '../contains-keywords';

describe('containsKeywords', () => {
	const evalFn = containsKeywords();

	describe('all keywords present', () => {
		it('returns pass: true when a single keyword is found', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The weather in London is rainy today',
				expected: 'weather',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('All 1 keywords found');
		});

		it('returns pass: true when all keywords are found', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The weather in London is rainy today',
				expected: 'weather, London, rainy',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('All 3 keywords found');
		});

		it('is case-insensitive', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The Weather In London Is Rainy Today',
				expected: 'weather, london, rainy',
			});
			expect(result.pass).toBe(true);
		});

		it('finds keywords as substrings', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The weatherman said it will rain',
				expected: 'weather',
			});
			expect(result.pass).toBe(true);
		});

		it('trims whitespace around expected keywords', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The weather in London is rainy',
				expected: '  weather  ,  London  ',
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('missing keywords', () => {
		it('returns pass: false when some keywords are missing', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'The weather is nice today',
				expected: 'weather, London, rainy',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('Missing');
			expect(result.reasoning).toContain('london');
			expect(result.reasoning).toContain('rainy');
		});

		it('returns pass: false when all keywords are missing', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'Nothing relevant here',
				expected: 'weather, London',
			});
			expect(result.pass).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('returns pass: false when expected is undefined', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'some text',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected keywords provided');
		});

		it('returns pass: false when expected is an empty string', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'some text',
				expected: '',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected keywords provided');
		});

		it('returns pass: false when expected contains only commas and whitespace', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'some text',
				expected: '  ,  ,  ',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No keywords to check');
		});

		it('handles empty output', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'weather',
			});
			expect(result.pass).toBe(false);
		});
	});
});
