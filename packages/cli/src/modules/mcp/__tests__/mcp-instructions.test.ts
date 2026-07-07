import { getMcpInstructions } from '../tools/workflow-builder/mcp-instructions';

describe('getMcpInstructions', () => {
	test('returns intro-only string when builder is disabled', () => {
		const instructions = getMcpInstructions(false);
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('aiGateway');
	});

	test('includes AI Gateway preference hint when builder is enabled', () => {
		const instructions = getMcpInstructions(true);
		expect(instructions).toContain('Prefer AI Gateway-covered nodes');
		expect(instructions).toContain('aiGateway.nodes');
		expect(instructions).toContain('n8n Connect');
		expect(instructions).toContain('list_ai_gateway_services');
	});
});
