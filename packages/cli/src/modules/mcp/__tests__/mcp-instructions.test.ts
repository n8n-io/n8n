import { getMcpInstructions } from '../tools/workflow-builder/mcp-instructions';

describe('getMcpInstructions', () => {
	test('returns intro-only string when builder is disabled', () => {
		const instructions = getMcpInstructions(false);
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('n8nConnect');
	});

	test('includes n8n credits hint when builder is enabled and n8n Connect is available', () => {
		const instructions = getMcpInstructions(true, true);
		expect(instructions).toContain('nodes covered by n8n credits');
		expect(instructions).toContain('n8nConnect.nodes');
		expect(instructions).toContain('n8n credits');
		expect(instructions).toContain('list_n8n_connect_services');
	});

	test('omits n8n credits hint when n8n Connect is not available', () => {
		const instructions = getMcpInstructions(true, false);
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('n8n credits');
		expect(instructions).not.toContain('n8nConnect');
		expect(instructions).not.toContain('list_n8n_connect_services');
	});

	test('omits n8n credits hint by default', () => {
		const instructions = getMcpInstructions(true);
		expect(instructions).not.toContain('n8n credits');
	});
});
