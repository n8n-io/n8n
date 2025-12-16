import { describe, expect } from 'vitest';
import { splitTextBySearch } from './stringUtils';

describe(splitTextBySearch, () => {
	it('should return one element with isMatched=false if search text is empty', () => {
		expect(splitTextBySearch('The quick brown fox jumps over the lazy dog', '')).toEqual([
			{ isMatched: false, content: 'The quick brown fox jumps over the lazy dog' },
		]);
	});

	it('should split given text by matches to the search', () => {
		expect(splitTextBySearch('The quick brown fox jumps over the lazy dog', 'quick')).toEqual([
			{ isMatched: false, content: 'The ' },
			{ isMatched: true, content: 'quick' },
			{ isMatched: false, content: ' brown fox jumps over the lazy dog' },
		]);
	});

	it('should match case insensitive', () => {
		expect(splitTextBySearch('The quick brown fox jumps over the lazy dog', 'Quick')).toEqual([
			{ isMatched: false, content: 'The ' },
			{ isMatched: true, content: 'quick' },
			{ isMatched: false, content: ' brown fox jumps over the lazy dog' },
		]);
	});

	it('should match all occurrences', () => {
		expect(splitTextBySearch('The quick brown fox jumps over the lazy dog', 'the')).toEqual([
			{ isMatched: true, content: 'The' },
			{ isMatched: false, content: ' quick brown fox jumps over ' },
			{ isMatched: true, content: 'the' },
			{ isMatched: false, content: ' lazy dog' },
		]);
	});
});
