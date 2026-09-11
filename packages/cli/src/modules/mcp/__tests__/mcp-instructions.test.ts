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

	// CONTEXT-132 moved the preferences into the `get_user_preferences` tool. What stays
	// in the instructions is one caller-independent sentence pointing at it: clients that
	// defer tool descriptions never read the tool's own description before building.
	describe('preferences', () => {
		const HINT =
			'Before you create or modify anything in n8n — a workflow, an Agent, a data table, a folder — call get_user_preferences first and apply what it returns for the remainder of the task.';

		test('carries no preferences block, ever', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				isUserPreferencesEnabled: true,
			});

			expect(instructions).not.toContain('<ai-preferences>');
			expect(instructions).not.toContain('Instance preferences');
			expect(instructions).not.toContain('Personal preferences');
		});

		test('names the tool only when it is registered for the caller', () => {
			expect(getMcpInstructions({ isBuilderEnabled: true })).not.toContain('get_user_preferences');
			expect(
				getMcpInstructions({ isBuilderEnabled: true, isUserPreferencesEnabled: true }),
			).toContain(HINT);
		});

		test('puts the pointer directly after the intro, before any build steps', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				isAgentsEnabled: true,
				isUserPreferencesEnabled: true,
			});

			expect(instructions.indexOf(HINT)).toBeGreaterThan(
				instructions.indexOf('official MCP server for n8n'),
			);
			expect(instructions.indexOf(HINT)).toBeLessThan(
				instructions.indexOf('Choose the artifact before choosing build tools'),
			);
		});

		test('shows the pointer even when the builder is disabled', () => {
			expect(
				getMcpInstructions({ isBuilderEnabled: false, isUserPreferencesEnabled: true }),
			).toContain(HINT);
		});

		test('is identical for every caller with the same options', () => {
			const options = {
				isBuilderEnabled: true,
				isN8nConnectAvailable: true,
				canvasGroupsEnabled: true,
				isAgentsEnabled: true,
				isUserPreferencesEnabled: true,
			};

			expect(getMcpInstructions(options)).toBe(getMcpInstructions(options));
		});
	});
});
