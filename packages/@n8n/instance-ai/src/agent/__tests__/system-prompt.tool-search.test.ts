import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — tool discovery', () => {
	it('omits tool discovery when no tools are deferred', () => {
		expect(getSystemPrompt({ toolSearchEnabled: false })).not.toContain('## Tool Discovery');
	});

	it('explains search_tools and load_tool when the runtime searches locally', () => {
		const prompt = getSystemPrompt({ toolSearchEnabled: true });
		expect(prompt).toContain('`search_tools`');
		expect(prompt).toContain('`load_tool`');
	});

	it('points to the provider tool search, not search_tools or load_tool, when the provider searches', () => {
		const prompt = getSystemPrompt({
			toolSearchEnabled: true,
			mcpToolSearchEnabled: true,
			nativeToolSearch: true,
		});
		expect(prompt).toContain('## Tool Discovery');
		expect(prompt).toContain('tool search tool');
		expect(prompt).not.toContain('search_tools');
		expect(prompt).not.toContain('load_tool');
	});
});
