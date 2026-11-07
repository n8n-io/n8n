import { excerpt } from '../memory/history-recall-tool';

describe('read_history excerpt', () => {
	const long = 'a'.repeat(10_000) + 'NEEDLE-123' + 'b'.repeat(10_000);

	it('returns short text whole', () => {
		expect(excerpt('short', 'short')).toEqual({ text: 'short', offset: 0, truncated: false });
	});

	it('centres a long message on the search match', () => {
		const result = excerpt(long, 'needle-123');
		expect(result.text).toContain('NEEDLE-123');
		expect(result.text).toHaveLength(4_000);
		expect(result.offset).toBe(8_000);
		expect(result.truncated).toBe(true);
	});

	it('keeps the excerpt inside the message when the match is near the end', () => {
		const text = 'a'.repeat(10_000) + 'END';
		const result = excerpt(text, 'end');
		expect(result.text.endsWith('END')).toBe(true);
		expect(result.text).toHaveLength(4_000);
	});

	it('starts at the beginning without a search', () => {
		expect(excerpt(long).offset).toBe(0);
	});
});
