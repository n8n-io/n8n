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
			expect(instructions.includes('pick by description')).toBe(
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
		test('tells the client to fix reported group issues', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				isN8nConnectAvailable: true,
			});

			expect(instructions).toContain('fix reported group issues');
		});

		test('stays intro-only when the builder is disabled', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: false,
				isN8nConnectAvailable: false,
			});

			expect(instructions).toContain('official MCP server for n8n');
			expect(instructions).not.toContain('group issues');
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
				instructions.indexOf('Choose the artifact first'),
			);
		});

		// Claude Code keeps only the first 2048 characters of the instructions, so a pointer
		// below that line never arrives. This is what the ordering test above is really
		// protecting; assert it directly so a new section inserted above the pointer fails here
		// rather than silently in a client.
		test('lands inside the 2048-character budget a client may truncate to', () => {
			const instructions = getMcpInstructions({
				isBuilderEnabled: true,
				isN8nConnectAvailable: true,
				isAgentsEnabled: true,
				isUserPreferencesEnabled: true,
			});

			expect(instructions.indexOf(HINT) + HINT.length).toBeLessThan(2048);
		});

		test('shows the pointer even when the builder is disabled', () => {
			expect(
				getMcpInstructions({ isBuilderEnabled: false, isUserPreferencesEnabled: true }),
			).toContain(HINT);
		});
	});
});

describe('client character limit', () => {
	const CLIENT_INSTRUCTIONS_LIMIT = 2048;
	const allOptionsEnabled = {
		isBuilderEnabled: true,
		isN8nConnectAvailable: true,
		isAgentsEnabled: true,
		isInstanceContextEnabled: true,
		isUserPreferencesEnabled: true,
		credentialDescriptionsEnabled: true,
	};

	test('fits the whole text inside the limit when every option is enabled', () => {
		expect(getMcpInstructions(allOptionsEnabled).length).toBeLessThanOrEqual(
			CLIENT_INSTRUCTIONS_LIMIT,
		);
	});

	test('names the workflow build tools in order', () => {
		const instructions = getMcpInstructions(allOptionsEnabled);
		const orderedTools = [
			'get_workflow_sdk_reference',
			'get_workflow_best_practices',
			'search_nodes',
			'get_node_types',
			'validate_workflow',
			'create_workflow_from_code',
			'test_workflow',
		];

		const positions = orderedTools.map((tool) =>
			instructions.indexOf(tool, instructions.indexOf('Workflow build:')),
		);

		expect(positions).not.toContain(-1);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	test('routes the artifact before the Agent build starts with its reference', () => {
		const instructions = getMcpInstructions(allOptionsEnabled);
		const routingStart = instructions.indexOf('Choose the artifact first');
		const agentStart = instructions.indexOf('Agent build');

		expect(routingStart).toBeGreaterThan(-1);
		expect(agentStart).toBeGreaterThan(routingStart);
		expect(instructions.indexOf('get_agent_builder_reference first')).toBeGreaterThan(agentStart);
	});

	test('omits workflow tools when the builder is disabled', () => {
		const instructions = getMcpInstructions({ ...allOptionsEnabled, isBuilderEnabled: false });

		expect(instructions).not.toContain('Choose the artifact first');
		expect(instructions).not.toContain('get_workflow_sdk_reference');
		expect(instructions).toContain('get_agent_builder_reference');
	});

	test('omits Agent tools when Agents are disabled', () => {
		const instructions = getMcpInstructions({ ...allOptionsEnabled, isAgentsEnabled: false });

		expect(instructions).not.toContain('Choose the artifact first');
		expect(instructions).not.toContain('get_agent_builder_reference');
		expect(instructions).toContain('get_workflow_sdk_reference');
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
	 */
	it('keeps the pointer inside the 2048 characters a client may truncate to', () => {
		const instructions = getMcpInstructions({
			isBuilderEnabled: true,
			isInstanceContextEnabled: true,
		});

		const start = instructions.indexOf('Start with the instance');
		expect(start).toBeGreaterThan(-1);

		const end = instructions.indexOf('\n\n', start);
		expect(end).toBeLessThan(2048);
	});
});
