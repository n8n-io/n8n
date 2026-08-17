import { expandToTokenSpan } from '../token-span';

function expand(text: string, match: string): string {
	return expandToTokenSpan(text, text.indexOf(match), match.length);
}

describe('expandToTokenSpan', () => {
	it('includes a prefix the match started after', () => {
		expect(expand('key AQ.abc123 rest', 'abc123')).toBe('AQ.abc123');
	});

	it('includes a suffix the match stopped before', () => {
		expect(expand('key abc123:tail rest', 'abc123')).toBe('abc123:tail');
	});

	it('returns the match unchanged when it already spans the whole run', () => {
		expect(expand('abc123', 'abc123')).toBe('abc123');
	});

	it('drops quotes and separators a serialized value sits in', () => {
		expect(expand('{"apiKey":"AQ.abc123",}', 'abc123')).toBe('AQ.abc123');
	});

	it('drops a sentence-ending dot but keeps dots inside the token', () => {
		expect(expand('Use AQ.abc.123. Then continue', 'abc')).toBe('AQ.abc.123');
	});

	it('keeps base64 padding', () => {
		expect(expand('value abc123== rest', 'abc123')).toBe('abc123==');
	});

	it('never trims into the match itself', () => {
		expect(expand('leading (abc123) trailing', '(abc123)')).toBe('(abc123)');
	});

	// A console rendering `NAME=<key>`, a curl sample or a "use this URL" snippet
	// must not become part of the captured credential.
	it('stops at an assignment', () => {
		expect(expand('GOOGLE_API_KEY=AQ.abc123 rest', 'abc123')).toBe('AQ.abc123');
	});

	it('stops at query-string punctuation', () => {
		expect(expand('https://api.test/v1?key=AQ.abc123&alt=json', 'abc123')).toBe('AQ.abc123');
	});

	it('stops at a dash used as prose punctuation', () => {
		expect(expand('Key—AQ.abc123 rest', 'abc123')).toBe('AQ.abc123');
	});

	it('gives up rather than return a whole unbroken run', () => {
		const run = 'x'.repeat(5000);

		expect(expand(`${run}abc123${run}`, 'abc123')).toBe('abc123');
	});
});
