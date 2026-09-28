import { getSystemPrompt } from '../system-prompt';

describe('system prompt: preview tabs', () => {
	it('tells the model that the latest tabs block is current and a missing block means no change', () => {
		const prompt = getSystemPrompt({});
		expect(prompt).toContain('## Preview Tabs');
		expect(prompt).toContain(
			'The latest `<thread-artifacts>` block lists the tabs the user has open now',
		);
		expect(prompt).toContain('a user message without one means nothing changed');
	});

	it('tells the model that a closed item can still be used when the user asks', () => {
		const prompt = getSystemPrompt({});
		expect(prompt).toContain(
			'act on it when the user asks, but do not assume the user is looking at it',
		);
	});
});
