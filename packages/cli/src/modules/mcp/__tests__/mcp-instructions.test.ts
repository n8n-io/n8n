import { getMcpInstructions } from '../tools/workflow-builder/mcp-instructions';

describe('getMcpInstructions', () => {
	test('returns intro-only string when builder is disabled', () => {
		const instructions = getMcpInstructions({ isBuilderEnabled: false });
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('gatewayCredits');
	});

	test('includes n8n credits hint when builder is enabled and n8n Connect is available', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: true,
			isN8nConnectAvailable: true,
		});
		expect(instructions).toContain('nodes covered by Gateway credits');
		expect(instructions).toContain('gatewayCredits.nodes');
		expect(instructions).toContain('Gateway credits');
		expect(instructions).toContain('list_n8n_gateway_services');
	});

	test('omits n8n credits hint when n8n Connect is not available', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: true,
			isN8nConnectAvailable: false,
		});
		expect(instructions).toContain('official MCP server for n8n');
		expect(instructions).not.toContain('Gateway credits');
		expect(instructions).not.toContain('gatewayCredits');
		expect(instructions).not.toContain('list_n8n_gateway_services');
	});

	test('omits n8n credits hint by default', () => {
		const instructions = getMcpInstructions({ isBuilderEnabled: true });
		expect(instructions).not.toContain('Gateway credits');
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
				expect(instructions).not.toContain('does not fail the whole update');
				expect(instructions).not.toContain('skippedOperations');
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

	describe('aiPreferences', () => {
		const block =
			'<ai-preferences>\nPersonal preferences:\n- Keep replies short.\n</ai-preferences>';

		test('appends the block as the last section', () => {
			const instructions = getMcpInstructions({ isBuilderEnabled: true, aiPreferences: block });
			expect(instructions.endsWith(block)).toBe(true);
			expect(instructions.indexOf(block)).toBeGreaterThan(
				instructions.indexOf('official MCP server for n8n'),
			);
		});

		test('appends the block even when the builder is disabled', () => {
			const instructions = getMcpInstructions({ isBuilderEnabled: false, aiPreferences: block });
			expect(instructions).toBe(
				`This is the official MCP server for n8n, a workflow automation platform.\n\n${block}`,
			);
		});

		test('leaves the instructions unchanged when there is no block', () => {
			expect(getMcpInstructions({ isBuilderEnabled: true, aiPreferences: undefined })).toBe(
				getMcpInstructions({ isBuilderEnabled: true }),
			);
			expect(getMcpInstructions({ isBuilderEnabled: true })).not.toContain('<ai-preferences>');
		});
	});
});
