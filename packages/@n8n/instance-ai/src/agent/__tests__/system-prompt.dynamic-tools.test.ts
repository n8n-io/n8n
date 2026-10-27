import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — dynamic tools', () => {
	it('points the model at get_tools and call_tool instead of tool search', () => {
		const prompt = getSystemPrompt({ toolSearchEnabled: false, dynamicToolsEnabled: true });

		expect(prompt).toContain('## Tool Discovery');
		expect(prompt).toContain('`get_tools`');
		expect(prompt).toContain('`call_tool`');
		expect(prompt).not.toContain('`search_tools`');
	});

	it('keeps the tool search section when dynamic tools are off', () => {
		const prompt = getSystemPrompt({ toolSearchEnabled: true });

		expect(prompt).toContain('`search_tools`');
		expect(prompt).not.toContain('`call_tool`');
	});
});
