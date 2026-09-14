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

		// Claude Code keeps only the first 2048 characters of the instructions and the full text
		// is over 9000, so a pointer below that line never arrives. This is what the ordering
		// test above is really protecting; assert it directly so a new section inserted above
		// the pointer fails here rather than silently in a client.
		test('lands inside the 2048-character budget a client may truncate to', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				isN8nConnectAvailable: true,
				canvasGroupsEnabled: true,
				isAgentsEnabled: true,
				isUserPreferencesEnabled: true,
			});

			expect(instructions.length).toBeGreaterThan(2048);
			expect(instructions.indexOf(HINT) + HINT.length).toBeLessThan(2048);
		});

		test('shows the pointer even when the builder is disabled', () => {
			expect(
				getMcpInstructions({ isBuilderEnabled: false, isUserPreferencesEnabled: true }),
			).toContain(HINT);
		});
	});
});
