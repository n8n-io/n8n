import { getSystemPrompt } from '../system-prompt';

describe('system prompt: saving preferences', () => {
	it('tells the model when to call save_user_preference, and when not to', () => {
		const prompt = getSystemPrompt({ preferenceSavingEnabled: true });
		expect(prompt).toContain('## Saving Preferences');
		expect(prompt).toContain('`save_user_preference`');
		expect(prompt).toContain('lasting rule or preference for future work');
		expect(prompt).toContain('Skip one-off instructions');
		expect(prompt).toContain('Confirm only after success');
	});

	it('tells the model to retry a too-long text once, and to stop on any other refusal', () => {
		const prompt = getSystemPrompt({ preferenceSavingEnabled: true });
		expect(prompt).toContain('shorten it and retry once');
		expect(prompt).toContain("On any other refusal, tell the user and don't retry");
	});

	it('says nothing about preferences when the feature is off', () => {
		const prompt = getSystemPrompt({ preferenceSavingEnabled: false });
		expect(prompt).not.toContain('## Saving Preferences');
		expect(prompt).not.toContain('save_user_preference');
	});
});
