import { getSystemPrompt } from '../system-prompt';

describe('system prompt: sending feedback', () => {
	it('names send_feedback when the tool is registered', () => {
		expect(getSystemPrompt({ feedbackToolEnabled: true })).toContain('`send_feedback`');
	});

	it('does not name send_feedback when the tool is not registered', () => {
		expect(getSystemPrompt({ feedbackToolEnabled: false })).not.toContain('send_feedback');
	});
});
