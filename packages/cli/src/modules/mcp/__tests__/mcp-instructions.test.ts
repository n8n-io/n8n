import { getMcpInstructions } from '../tools/workflow-builder/mcp-instructions';

describe('getMcpInstructions', () => {
	test('returns intro-only string when builder is disabled', () => {
		const instructions = getMcpInstructions({ isBuilderEnabled: false });
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('n8nConnect');
	});

	test('includes n8n credits hint when builder is enabled and n8n Connect is available', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: true,
			isN8nConnectAvailable: true,
		});
		expect(instructions).toContain('nodes covered by n8n credits');
		expect(instructions).toContain('n8nConnect.nodes');
		expect(instructions).toContain('n8n credits');
		expect(instructions).toContain('list_n8n_connect_services');
	});

	test('omits n8n credits hint when n8n Connect is not available', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: true,
			isN8nConnectAvailable: false,
		});
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('n8n credits');
		expect(instructions).not.toContain('n8nConnect');
		expect(instructions).not.toContain('list_n8n_connect_services');
	});

	test('omits n8n credits hint by default', () => {
		const instructions = getMcpInstructions({ isBuilderEnabled: true });
		expect(instructions).not.toContain('n8n credits');
	});

	describe('node groups pointer', () => {
		describe('when canvasGroupsEnabled is true', () => {
			test('points the client to the groups reference', () => {
				const instructions = getMcpInstructions({
					isBuilderEnabled: true,
					isN8nConnectAvailable: true,
					canvasGroupsEnabled: true,
				});

				expect(instructions).toMatch(/group/i);
				// Points at the on-demand groups section of the SDK reference.
				expect(instructions).toContain('"groups"');
			});

			test('stays intro-only when the builder is disabled', () => {
				const instructions = getMcpInstructions({
					isBuilderEnabled: false,
					isN8nConnectAvailable: false,
					canvasGroupsEnabled: true,
				});

				expect(instructions).toContain('official MCP server for n8n');
				expect(instructions).not.toContain('"groups"');
			});
		});

		describe('when canvasGroupsEnabled is false', () => {
			test('does not mention the groups reference', () => {
				const instructions = getMcpInstructions({
					isBuilderEnabled: true,
					isN8nConnectAvailable: true,
					canvasGroupsEnabled: false,
				});

				expect(instructions).not.toContain('"groups"');
			});

			test('omits the groups pointer by default', () => {
				const instructions = getMcpInstructions({
					isBuilderEnabled: true,
					isN8nConnectAvailable: true,
				});

				expect(instructions).not.toContain('"groups"');
			});
		});
	});
});
