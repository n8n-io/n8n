import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — custom MCP servers', () => {
	it('routes a request to build an MCP server to the custom-mcp-servers tool', () => {
		const prompt = getSystemPrompt({ customMcpServersEnabled: true });

		expect(prompt).toContain('To build an MCP server from workflows, use a custom MCP server.');
		expect(prompt).toContain('run `custom-mcp-servers` through `call_tool`');
		// The custom server rule comes first, so the two-servers question does not catch the request.
		expect(prompt.indexOf('use a custom MCP server')).toBeLessThan(
			prompt.indexOf('n8n has two MCP servers'),
		);
	});

	it.each([undefined, false])('leaves the rule out when the tool is not wired: %s', (enabled) => {
		const prompt = getSystemPrompt({ customMcpServersEnabled: enabled });

		expect(prompt).not.toContain('custom-mcp-servers');
		expect(prompt).toContain('n8n has two MCP servers');
	});
});
