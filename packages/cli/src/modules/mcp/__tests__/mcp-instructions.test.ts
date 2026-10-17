import { getMcpInstructions } from '../tools/workflow-builder/mcp-instructions';

describe('getMcpInstructions', () => {
	test.each([true, false, undefined])(
		'gates credential description guidance when the flag is %s',
		(credentialDescriptionsEnabled) => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				credentialDescriptionsEnabled,
			});
			expect(instructions).toContain('list_credentials');
			expect(instructions.includes('read their descriptions')).toBe(
				credentialDescriptionsEnabled === true,
			);
		},
	);

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
		test('points the client to the groups reference', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				isN8nConnectAvailable: true,
			});

			expect(instructions).toMatch(/group/i);
			// Points at the on-demand groups section of the SDK reference.
			expect(instructions).toContain('"groups"');
		});

		test('stays intro-only when the builder is disabled', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: false,
				isN8nConnectAvailable: false,
			});

			expect(instructions).toContain('official MCP server for n8n');
			expect(instructions).not.toContain('"groups"');
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

describe('instance context', () => {
	it('names the resource and the tool when the surface is on', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: false,
			isInstanceContextEnabled: true,
		});

		expect(instructions).toContain('n8n://instance/context');
		expect(instructions).toContain('get_instance_context');
	});

	/** Every word here is paid for on every session, so an off surface costs nothing. */
	it('says nothing about it when the surface is off', () => {
		const instructions = getMcpInstructions({ isBuilderEnabled: false });

		expect(instructions).not.toContain('n8n://instance/context');
		expect(instructions).not.toContain('get_instance_context');
	});

	/**
	 * A client may keep only the opening of these instructions — Claude Code truncates at 2048
	 * characters — so a pointer below the cut never arrives and the surface goes undiscovered.
	 * The full text is well past the budget, which is what makes the position matter.
	 */
	it('keeps the pointer inside the 2048 characters a client may truncate to', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: true,
			isInstanceContextEnabled: true,
		});

		const start = instructions.indexOf('Start with the instance');
		expect(start).toBeGreaterThan(-1);

		const end = instructions.indexOf('\n\n', start);
		expect(instructions.length).toBeGreaterThan(2048);
		expect(end).toBeLessThan(2048);
	});
});
