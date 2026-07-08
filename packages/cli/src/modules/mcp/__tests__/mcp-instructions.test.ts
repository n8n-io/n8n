import { getMcpInstructions } from '../tools/workflow-builder/mcp-instructions';

describe('getMcpInstructions', () => {
	test('returns intro-only string when builder is disabled', () => {
		const instructions = getMcpInstructions(false);
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('n8nConnect');
	});

	test('includes n8n Connect preference hint when builder is enabled', () => {
		const instructions = getMcpInstructions(true);
		expect(instructions).toContain('Prefer n8n Connect-compatible nodes');
		expect(instructions).toContain('n8nConnect.nodes');
		expect(instructions).toContain('n8n Connect');
		expect(instructions).toContain('list_n8n_connect_services');
	});
});
