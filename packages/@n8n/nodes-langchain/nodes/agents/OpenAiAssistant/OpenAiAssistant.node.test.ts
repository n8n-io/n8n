import { OpenAiAssistant } from './OpenAiAssistant.node';

describe('OpenAiAssistant node', () => {
	it('does not offer documentation for a hidden node', () => {
		const { description } = new OpenAiAssistant();

		expect(description.hidden).toBe(true);
		expect(description.codex?.resources?.primaryDocumentation).toBeUndefined();
	});
});
