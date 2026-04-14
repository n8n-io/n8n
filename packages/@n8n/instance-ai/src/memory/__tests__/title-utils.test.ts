jest.mock('@mastra/core/agent', () => {
	const MockAgent = jest.fn();
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	MockAgent.prototype.generate = jest.fn().mockResolvedValue({ text: '' });
	return { Agent: MockAgent };
});

import { truncateToTitle } from '../title-utils';

describe('truncateToTitle', () => {
	it('returns short messages unchanged', () => {
		expect(truncateToTitle('Build a Slack workflow')).toBe('Build a Slack workflow');
	});

	it('trims whitespace', () => {
		expect(truncateToTitle('  hello world  ')).toBe('hello world');
	});

	it('collapses multiple whitespace characters', () => {
		expect(truncateToTitle('hello\n\nworld\t\tfoo')).toBe('hello world foo');
	});

	it('truncates long messages at a word boundary', () => {
		const long =
			'Build a workflow that connects Gmail to Slack and sends notifications for every new email';
		const result = truncateToTitle(long);
		expect(result.length).toBeLessThanOrEqual(61); // 60 + ellipsis
		expect(result.endsWith('\u2026')).toBe(true);
	});

	it('truncates at max length when no suitable word boundary', () => {
		const noSpaces = 'a'.repeat(100);
		const result = truncateToTitle(noSpaces);
		expect(result).toBe('a'.repeat(60) + '\u2026');
	});

	it('handles exactly 60-char messages', () => {
		const exact = 'x'.repeat(60);
		expect(truncateToTitle(exact)).toBe(exact);
	});

	it('handles empty messages', () => {
		expect(truncateToTitle('')).toBe('');
		expect(truncateToTitle('   ')).toBe('');
	});

	it('handles multi-line messages', () => {
		const multiLine = 'First line\nSecond line\nThird line';
		expect(truncateToTitle(multiLine)).toBe('First line Second line Third line');
	});

	it('preserves word boundary only when lastSpace > 20', () => {
		// Short prefix followed by a long word — lastSpace is at position < 20
		const msg = 'Hi ' + 'x'.repeat(80);
		const result = truncateToTitle(msg);
		// lastSpace is at position 2, which is <= 20, so it should truncate at 60
		expect(result).toBe(msg.slice(0, 60) + '\u2026');
	});
});
