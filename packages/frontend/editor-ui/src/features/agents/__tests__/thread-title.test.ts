import { describe, expect, it } from 'vitest';
import { formatThreadTitle } from '../utils/thread-title';

const FALLBACK = 'New chat';

describe('formatThreadTitle', () => {
	it('returns the LLM-generated title when present', () => {
		expect(formatThreadTitle({ title: 'Refactor billing webhooks' }, FALLBACK)).toBe(
			'Refactor billing webhooks',
		);
	});

	it('uses the fallback, not the first message, while the title is missing', () => {
		const thread = { title: null, firstMessage: 'How do I add a Slack trigger to my agent?' };
		expect(formatThreadTitle(thread, FALLBACK)).toBe(FALLBACK);
	});

	it('uses the fallback for an empty title', () => {
		expect(formatThreadTitle({ title: '' }, FALLBACK)).toBe(FALLBACK);
	});
});
