const mockAgentInstances: Array<{
	model: jest.Mock;
	instructions: jest.Mock;
	tool: jest.Mock;
	checkpoint: jest.Mock;
	memory: jest.Mock;
	telemetry: jest.Mock;
}> = [];

jest.mock('@n8n/agents', () => ({
	Agent: jest.fn().mockImplementation(function Agent(this: (typeof mockAgentInstances)[number]) {
		this.model = jest.fn().mockReturnThis();
		this.instructions = jest.fn().mockReturnThis();
		this.tool = jest.fn().mockReturnThis();
		this.checkpoint = jest.fn().mockReturnThis();
		this.memory = jest.fn().mockReturnThis();
		this.telemetry = jest.fn().mockReturnThis();
		mockAgentInstances.push(this);
	}),
}));

const mockBuiltTool = (name: string, marker?: string) => ({
	name,
	description: name,
	handler: jest.fn(),
	marker,
});

jest.mock('../../tools', () => ({
	createAllTools: jest.fn((context: { runLabel?: string }) => ({
		workflows: mockBuiltTool(`workflows-${context.runLabel ?? 'unknown'}`),
	})),
	createOrchestratorDomainTools: jest.fn((context: { runLabel?: string }) => ({
		workflows: mockBuiltTool(`workflows-${context.runLabel ?? 'unknown'}`),
	})),
	createOrchestrationTools: jest.fn((context: { runId: string }) => ({
		plan: mockBuiltTool(`plan-${context.runId}`),
		'build-workflow-with-agent': mockBuiltTool(`build-${context.runId}`),
	})),
}));

jest.mock('../../tools/filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: jest.fn().mockReturnValue({}),
}));

jest.mock('../../tracing/langsmith-tracing', () => ({
	buildAgentTraceInputs: jest.fn().mockReturnValue({}),
	mergeTraceRunInputs: jest.fn(),
}));

jest.mock('../system-prompt', () => ({
	getSystemPrompt: jest.fn().mockReturnValue('system prompt'),
}));

const { createInstanceAgent } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../instance-agent') as typeof import('../instance-agent');
const { Agent } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@n8n/agents') as { Agent: jest.Mock };
const { createToolsFromLocalMcpServer } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools/filesystem/create-tools-from-mcp-server') as {
		createToolsFromLocalMcpServer: jest.Mock;
	};
const { createOrchestratorDomainTools } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools') as { createOrchestratorDomainTools: jest.Mock };

function createMcpManagerStub(
	regularTools: Record<string, ReturnType<typeof mockBuiltTool>> = {},
	browserTools: Record<string, ReturnType<typeof mockBuiltTool>> = {},
) {
	return {
		getRegularTools: jest.fn().mockResolvedValue(regularTools),
		getBrowserTools: jest.fn().mockResolvedValue(browserTools),
		disconnect: jest.fn().mockResolvedValue(undefined),
	};
}

function getAttachedTools(agentIndex = 0) {
	const instance = mockAgentInstances[agentIndex];
	const calls = (instance?.tool.mock.calls ?? []) as unknown as Array<
		[Array<ReturnType<typeof mockBuiltTool>>]
	>;
	const tools = calls[0]?.[0];
	return Object.fromEntries((tools ?? []).map((tool) => [tool.name, tool]));
}

describe('createInstanceAgent', () => {
	beforeEach(() => {
		Agent.mockClear();
		mockAgentInstances.length = 0;
		createToolsFromLocalMcpServer.mockReset();
		createToolsFromLocalMcpServer.mockReturnValue({});
	});

	it('attaches a fresh native toolset for each run-scoped orchestrator agent', async () => {
		const memoryConfig = {
			lastMessages: 20,
		} as never;

		const mcpManager = createMcpManagerStub();
		const createOptions = (runId: string) =>
			({
				modelId: 'test-model',
				context: {
					runLabel: runId,
					localGatewayStatus: undefined,
					licenseHints: undefined,
					localMcpServer: undefined,
				},
				orchestrationContext: {
					runId,
					browserMcpConfig: undefined,
				},
				memoryConfig,
				mcpManager,
			}) as never;

		await createInstanceAgent(createOptions('run-1'));
		await createInstanceAgent(createOptions('run-2'));

		expect(Agent).toHaveBeenCalledTimes(2);
		expect(mockAgentInstances[0]?.tool).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ name: 'build-run-1' })]),
		);
		expect(mockAgentInstances[1]?.tool).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ name: 'build-run-2' })]),
		);
	});

	it('does not attach a workspace to the orchestrator Agent', async () => {
		const memoryConfig = { lastMessages: 20 } as never;
		const fakeWorkspace = { id: 'should-be-ignored' } as never;

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'ws-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'ws-test',
				browserMcpConfig: undefined,
				workspace: fakeWorkspace,
			},
			memoryConfig,
			mcpManager: createMcpManagerStub(),
			// Exercise the deprecated field to confirm it is ignored.
			workspace: fakeWorkspace,
		} as never);

		expect(Agent).toHaveBeenCalledWith('n8n-instance-agent');
		expect(mockAgentInstances[0]?.tool).toHaveBeenCalledTimes(1);
		expect(
			JSON.stringify([
				mockAgentInstances[0]?.model.mock.calls,
				mockAgentInstances[0]?.instructions.mock.calls,
				mockAgentInstances[0]?.tool.mock.calls,
				mockAgentInstances[0]?.checkpoint.mock.calls,
			]),
		).not.toContain('should-be-ignored');
	});

	it('attaches native telemetry from the trace context when present', async () => {
		const telemetry = { provider: 'langsmith' };

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'trace-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'trace-test',
				browserMcpConfig: undefined,
				tracing: {
					getTelemetry: jest.fn().mockReturnValue(telemetry),
					wrapTools: jest.fn((tools: unknown) => tools),
				},
			},
			memoryConfig: { lastMessages: 20 },
			mcpManager: createMcpManagerStub(),
		} as never);

		expect(mockAgentInstances[0]?.telemetry).toHaveBeenCalledWith(telemetry);
	});

	it('exposes browser_connect and browser_navigate from localMcpServer in the agent toolset', async () => {
		createOrchestratorDomainTools.mockReturnValueOnce({
			workflows: { id: 'workflows' },
			browser_connect: { id: 'browser_connect' },
			browser_navigate: { id: 'browser_navigate' },
		});
		createToolsFromLocalMcpServer.mockReturnValue({
			browser_connect: { id: 'browser_connect' },
			browser_navigate: { id: 'browser_navigate' },
		});

		const memoryConfig = { storage: { id: 'memory-store' } } as never;
		const localMcpServer = {
			getToolsByCategory: jest
				.fn()
				.mockReturnValue([{ name: 'browser_connect' }, { name: 'browser_navigate' }]),
		};

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'browser-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer,
			},
			orchestrationContext: { runId: 'browser-test', browserMcpConfig: undefined },
			memoryConfig,
			mcpManager: createMcpManagerStub(),
			disableDeferredTools: true,
		} as never);

		const calls = Agent.mock.calls as Array<[{ tools: Record<string, { id: string }> }]>;
		const agentTools = calls[0]?.[0].tools;
		expect(agentTools).toMatchObject({
			browser_connect: { id: 'browser_connect' },
			browser_navigate: { id: 'browser_navigate' },
		});
	});

	it('prefers local gateway tools over external MCP tools when names collide', async () => {
		const memoryConfig = { lastMessages: 20 } as never;
		const localMcpServer = {
			getToolsByCategory: jest.fn().mockReturnValue([]),
		};
		const localTools = {
			shared_tool: mockBuiltTool('shared_tool', 'local-shared'),
		};
		const externalTools = {
			shared_tool: mockBuiltTool('shared_tool', 'external-shared'),
			github_workflows: mockBuiltTool('github_workflows', 'github-workflows'),
			custom_plan: mockBuiltTool('custom_plan', 'custom-plan'),
		};
		const orchestrationContext: Record<string, unknown> = {
			runId: 'local-priority',
			browserMcpConfig: undefined,
		};
		createToolsFromLocalMcpServer.mockReturnValue(localTools);

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'local-priority',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer,
			},
			orchestrationContext,
			memoryConfig,
			mcpManager: createMcpManagerStub(externalTools),
		} as never);

		const agentTools = getAttachedTools();
		const mcpContextTools = orchestrationContext.mcpTools as Record<
			string,
			ReturnType<typeof mockBuiltTool>
		>;

		expect(agentTools.shared_tool).toMatchObject({ marker: 'local-shared' });
		expect(agentTools.github_workflows).toMatchObject({ marker: 'github-workflows' });
		expect(agentTools.custom_plan).toMatchObject({ marker: 'custom-plan' });
		expect(mcpContextTools.shared_tool).toMatchObject({ marker: 'local-shared' });
		expect(mcpContextTools.github_workflows).toMatchObject({ marker: 'github-workflows' });
	});
});
