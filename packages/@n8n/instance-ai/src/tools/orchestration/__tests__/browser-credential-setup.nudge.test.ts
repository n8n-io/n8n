import { buildNudgeStreamInput, NUDGE_PROMPT } from '../browser-credential-setup.nudge';

describe('buildNudgeStreamInput', () => {
	it('returns the bare nudge string when there are no prior messages', () => {
		const result = buildNudgeStreamInput([]);

		expect(result).toBe(NUDGE_PROMPT);
	});

	it('appends a nudge user message after the prior conversation', () => {
		const prior = [
			{ role: 'user' as const, content: 'briefing' },
			{ role: 'assistant' as const, content: 'I clicked some buttons' },
		];

		const result = buildNudgeStreamInput(prior);

		expect(Array.isArray(result)).toBe(true);
		const messages = result as Array<{ role: string; content: string }>;
		expect(messages).toHaveLength(3);
		expect(messages[0]).toBe(prior[0]);
		expect(messages[1]).toBe(prior[1]);
		expect(messages[2]).toEqual({ role: 'user', content: NUDGE_PROMPT });
	});

	it('does not mutate the input array', () => {
		const prior = [{ role: 'user' as const, content: 'briefing' }];
		const snapshot = [...prior];

		buildNudgeStreamInput(prior);

		expect(prior).toEqual(snapshot);
	});
});
