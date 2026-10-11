import { getSystemPrompt } from '../system-prompt';

describe('system prompt code mode', () => {
	it('tells the assistant to build a website in code mode', () => {
		const prompt = getSystemPrompt({});
		expect(prompt).toContain('code-mode');
		expect(prompt).toContain('Do not say you cannot build a website');
	});
});
