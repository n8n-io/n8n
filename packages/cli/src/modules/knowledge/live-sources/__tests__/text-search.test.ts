import { searchLines, tokenizeQuery } from '../strategies/text-search';

describe('tokenizeQuery', () => {
	it('keeps the content words of a question and drops the function words', () => {
		expect(tokenizeQuery('What does the Notion page titled "Not picked" say?')).toEqual([
			'notion',
			'picked',
		]);
	});

	it('lowercases, de-duplicates and strips punctuation', () => {
		expect(tokenizeQuery('Refund, refund! REFUND policy-2026')).toEqual(['refund', 'policy-2026']);
	});
});

describe('searchLines', () => {
	it('ranks the lines by the number of distinct terms, then by position', () => {
		const text = [
			'Pricing FAQ',
			'Refunds take 30 days.',
			'The refund policy of 2026 is strict.',
		].join('\n');

		expect(searchLines(text, ['refund', '2026'], 5)).toEqual([
			{ line: 3, score: 2, snippet: 'The refund policy of 2026 is strict.' },
			{ line: 2, score: 1, snippet: 'Refunds take 30 days.' },
		]);
	});
});
