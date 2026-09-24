import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — instance URLs', () => {
	// Instance URLs ride the turn in `<instance-urls>`. In the system prompt they would give
	// every instance its own prompt-cache prefix instead of one shared across instances.
	it('contains no instance URLs', () => {
		const prompt = getSystemPrompt({ projectId: 'project-1', toolSearchEnabled: true });

		expect(prompt).not.toMatch(/webhook base url|form base url|instance info/i);
		expect(prompt).not.toMatch(/https?:\/\//);
	});
});
