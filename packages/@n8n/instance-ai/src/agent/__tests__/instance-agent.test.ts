import type { ToolsInput } from '@mastra/core/agent';

jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn().mockImplementation(function Agent(
		this: { __registerMastra?: jest.Mock } & Record<string, unknown>,
		config: Record<string, unknown>,
	) {
		Object.assign(this, config);
		this.__registerMastra = jest.fn();
	}),
}));

jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn().mockImplementation(function Mastra() {}),
}));

jest.mock('@mastra/core/processors', () => ({
	ToolSearchProcessor: jest.fn().mockImplementation(function ToolSearchProcessor(
		this: Record<string, unknown>,
		config: Record<string, unknown>,
	) {
		Object.assign(this, config);
	}),
}));

jest.mock('../../memory/memory-config', () => ({
	createMemory: jest.fn().mockReturnValue({}),
}));

jest.mock('../../tools', () => ({
	createAllTools: jest.fn((context: { runLabel?: string }) => ({
		workflows: { id: `workflows-${context.runLabel ?? 'unknown'}` },
	})),
	createOrchestratorDomainTools: jest.fn((context: { runLabel?: string }) => ({
		workflows: { id: `workflows-${context.runLabel ?? 'unknown'}` },
	})),
	createOrchestrationTools: jest.fn((context: { runId: string }) => ({
		plan: { id: `plan-${context.runId}` },
		'build-workflow-with-agent': { id: `build-${context.runId}` },
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
const { ToolSearchProcessor } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/core/processors') as {
		ToolSearchProcessor: jest.Mock;
	};
const { Agent } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/core/agent') as { Agent: jest.Mock };
const { createToolsFromLocalMcpServer } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools/filesystem/create-tools-from-mcp-server') as {
		createToolsFromLocalMcpServer: jest.Mock;
	};
const { createOrchestratorDomainTools } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools') as { createOrchestratorDomainTools: jest.Mock };

function createMcpManagerStub(regularTools: ToolsInput = {}, browserTools: ToolsInput = {}) {
	return {
		getRegularTools: jest.fn().mockResolvedValue(regularTools),
		getBrowserTools: jest.fn().mockResolvedValue(browserTools),
		disconnect: jest.fn().mockResolvedValue(undefined),
	};
}

describe('createInstanceAgent', () => {
	beforeEach(() => {
		Agent.mockClear();
		ToolSearchProcessor.mockClear();
		createToolsFromLocalMcpServer.mockReset();
		createToolsFromLocalMcpServer.mockReturnValue({});
	});

	it('creates a fresh deferred tool processor for each run-scoped toolset', async () => {
		const memoryConfig = {
			storage: { id: 'memory-store' },
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

		expect(ToolSearchProcessor).toHaveBeenCalledTimes(2);
		const toolSearchCalls = ToolSearchProcessor.mock.calls as Array<
			[{ tools: Record<string, { id: string }> }]
		>;
		expect(toolSearchCalls[0]?.[0]?.tools).toMatchObject({
			'build-workflow-with-agent': { id: 'build-run-1' },
		});
		expect(toolSearchCalls[1]?.[0]?.tools).toMatchObject({
			'build-workflow-with-agent': { id: 'build-run-2' },
		});
	});

	it('does not attach a workspace to the orchestrator Agent', async () => {
		const memoryConfig = { storage: { id: 'memory-store' } } as never;
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

		expect(Agent).toHaveBeenCalledTimes(1);
		const calls = Agent.mock.calls as Array<[Record<string, unknown>]>;
		const firstCall = calls[0];
		expect(firstCall).toBeDefined();
		expect(firstCall[0]).not.toHaveProperty('workspace');
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
		const memoryConfig = { storage: { id: 'memory-store' } } as never;
		const localMcpServer = {
			getToolsByCategory: jest.fn().mockReturnValue([]),
		};
		const localTools = {
			shared_tool: { id: 'local-shared' },
		} as unknown as ToolsInput;
		const externalTools = {
			shared_tool: { id: 'external-shared' },
			github_workflows: { id: 'github-workflows' },
			custom_plan: { id: 'custom-plan' },
		} as unknown as ToolsInput;
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
			disableDeferredTools: true,
		} as never);

		const calls = Agent.mock.calls as Array<[Record<string, { tools?: ToolsInput }>]>;
		const agentTools = calls[0]?.[0].tools as Record<string, { id: string }>;
		const mcpContextTools = orchestrationContext.mcpTools as Record<string, { id: string }>;

		expect(agentTools.shared_tool).toMatchObject({ id: 'local-shared' });
		expect(agentTools.github_workflows).toMatchObject({ id: 'github-workflows' });
		expect(agentTools.custom_plan).toMatchObject({ id: 'custom-plan' });
		expect(mcpContextTools.shared_tool).toMatchObject({ id: 'local-shared' });
		expect(mcpContextTools.github_workflows).toMatchObject({ id: 'github-workflows' });
	});
});
