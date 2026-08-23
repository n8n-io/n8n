import { describe, expect, it } from 'vitest';
import { formatThreadTitle } from '../utils/thread-title';

const FALLBACK = 'New chat';

describe('formatThreadTitle', () => {
	it('returns the LLM-generated title when present', () => {
		expect(
			formatThreadTitle({ title: 'Refactor billing webhooks', firstMessage: 'help' }, FALLBACK),
		).toBe('Refactor billing webhooks');
	});

	it('falls back to the first user message preview when title is null', () => {
		expect(
			formatThreadTitle(
				{ title: null, firstMessage: 'How do I add a Slack trigger to my agent?' },
				FALLBACK,
			),
		).toBe('How do I add a Slack trigger to my agent?');
	});

	it('truncates long first messages with an ellipsis', () => {
		const long =
			'This is a very long question that goes on and on and clearly exceeds sixty characters in total length';
		const result = formatThreadTitle({ title: null, firstMessage: long }, FALLBACK);
		expect(result.length).toBeLessThanOrEqual(60);
		expect(result.endsWith('…')).toBe(true);
	});

	it('collapses whitespace in the preview', () => {
		expect(formatThreadTitle({ title: null, firstMessage: 'hello\n\nworld\t\t!' }, FALLBACK)).toBe(
			'hello world !',
		);
	});

	it('uses the fallback when both title and firstMessage are absent', () => {
		expect(formatThreadTitle({ title: null }, FALLBACK)).toBe(FALLBACK);
	});

	it('uses the fallback when firstMessage is whitespace-only', () => {
		expect(formatThreadTitle({ title: null, firstMessage: '   \n\t' }, FALLBACK)).toBe(FALLBACK);
	});
});
