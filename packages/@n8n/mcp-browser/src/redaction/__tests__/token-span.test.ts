import { assignmentNames, expandToTokenSpan, tokenize } from '../token-span';

function expand(text: string, match: string): string {
	return expandToTokenSpan(text, text.indexOf(match), match.length).span;
}

function delimited(text: string, match: string): boolean {
	return expandToTokenSpan(text, text.indexOf(match), match.length).delimited;
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

	it.each(['|', '*', '·', '…'])('stops at %s used as an inline separator', (separator) => {
		expect(expand(`AQ.abc123${separator}Copy`, 'abc123')).toBe('AQ.abc123');
	});

	// `+` is base64 and `~` is the Azure key shape, so both must keep crossing.
	it.each(['+', '~'])('crosses %s, which occurs inside secrets', (inner) => {
		expect(expand(`AQ.abc123${inner}def456 rest`, 'abc123')).toBe(`AQ.abc123${inner}def456`);
	});

	it('stops at a dash used as prose punctuation', () => {
		expect(expand('Key—AQ.abc123 rest', 'abc123')).toBe('AQ.abc123');
	});

	it('gives up rather than return a whole unbroken run', () => {
		const run = 'x'.repeat(5000);

		expect(expand(`${run}abc123${run}`, 'abc123')).toBe('abc123');
	});

	// A long match that expansion never extended is its own token — nothing was
	// guessed, so it must not be treated as undelimited (e.g. a PEM key).
	it('treats a match that is already the whole run as delimited', () => {
		const long = 'a'.repeat(600);

		expect(delimited(`before ${long} after`, long)).toBe(true);
	});

	// Callers must be able to tell a whole token from a match they fell back to.
	it('reports whether the token was delimited', () => {
		expect(delimited('key AQ.abc123 rest', 'abc123')).toBe(true);
		expect(delimited(`${'x'.repeat(5000)}abc123`, 'abc123')).toBe(false);
	});
});

describe('tokenize', () => {
	it.each([
		{
			named: 'strips punctuation around a value',
			text: '(abcdef1234567890),',
			want: ['abcdef1234567890'],
		},
		{ named: 'keeps a dot inside a token', text: 'AQ.Ab8RN6Jr7x', want: ['AQ.Ab8RN6Jr7x'] },
		{ named: 'never ends a token on a dot', text: 'value.', want: ['value'] },
		{
			named: 'keeps base64 padding',
			text: 'dGhpc2lzbm90YXJlYWw==',
			want: ['dGhpc2lzbm90YXJlYWw=='],
		},
		{
			named: 'breaks an assignment off its value',
			text: 'NAME=secretvalue',
			want: ['NAME=', 'secretvalue'],
		},
		{ named: 'drops empty runs', text: '  a   b  ', want: ['a', 'b'] },
	])('$named', ({ text, want }) => {
		expect(tokenize(text)).toEqual(want);
	});
});

describe('assignmentNames', () => {
	it.each([
		{ named: 'a name separating a value', text: 'NAME=secretvalue', want: ['NAME='] },
		{ named: 'every name in a chain', text: 'a=b=c', want: ['a=', 'b='] },
		{ named: 'nothing for base64 padding', text: 'dGhpc2lzbm90YXJlYWw==', want: [] },
		{ named: 'nothing for padding followed by more text', text: 'dGhpcw== copy', want: [] },
		{ named: 'a name across spaces', text: 'NAME = secretvalue', want: ['NAME'] },
		{
			named: 'a name when only the value is spaced off',
			text: 'NAME =secretvalue',
			want: ['NAME', '='],
		},
		// Indistinguishable from padding plus a word at this level, so left alone
		// rather than guessed at — guessing would uncapture a real base64 secret.
		{ named: 'nothing when only the name is spaced off', text: 'NAME= secretvalue', want: [] },
		{ named: 'nothing when there is no assignment', text: 'plain text here', want: [] },
	])('reports $named', ({ text, want }) => {
		expect(assignmentNames(text)).toEqual(want);
	});
});
