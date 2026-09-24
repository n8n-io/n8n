import { getSystemPrompt } from '../system-prompt';

describe('system prompt: saving preferences', () => {
	it('tells the model when to call save_user_preference, and when not to', () => {
		const prompt = getSystemPrompt({ preferenceSavingEnabled: true });
		expect(prompt).toContain('## Saving Preferences');
		expect(prompt).toContain('`save_user_preference`');
		expect(prompt).toContain('not only for the current task');
		expect(prompt).toContain(
			'Do not tell the user you saved a preference until the tool returns a success',
		);
	});

	it('says nothing about preferences when the feature is off', () => {
		const prompt = getSystemPrompt({ preferenceSavingEnabled: false });
		expect(prompt).not.toContain('## Saving Preferences');
		expect(prompt).not.toContain('save_user_preference');
	});
});
