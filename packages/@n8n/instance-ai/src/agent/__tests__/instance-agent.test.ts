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

jest.mock('@mastra/mcp', () => ({
	MCPClient: jest.fn().mockImplementation(() => ({
		listTools: jest.fn().mockResolvedValue({}),
	})),
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

jest.mock('../sanitize-mcp-schemas', () => ({
	sanitizeMcpToolSchemas: jest.fn((tools: Record<string, unknown>) => tools),
}));

jest.mock('../system-prompt', () => ({
	getSystemPrompt: jest.fn().mockReturnValue('system prompt'),
}));

const { createInstanceAgent } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../instance-agent') as typeof import('../instance-agent');
const { Agent } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/core/agent') as { Agent: jest.Mock };
const { ToolSearchProcessor } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/core/processors') as {
		ToolSearchProcessor: jest.Mock;
	};
const { MCPClient } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/mcp') as {
		MCPClient: jest.Mock;
	};
const { createToolsFromLocalMcpServer } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools/filesystem/create-tools-from-mcp-server') as {
		createToolsFromLocalMcpServer: jest.Mock;
	};

type AgentToolConfig = { tools: Record<string, { id: string }> };

function getLastAgentConfig(): AgentToolConfig {
	const agentCalls = Agent.mock.calls as Array<[AgentToolConfig]>;
	const agentConfig = agentCalls.at(-1)?.[0];
	if (!agentConfig) throw new Error('Expected Agent to be called');
	return agentConfig;
}

describe('createInstanceAgent', () => {
	const memoryConfig = {
		storage: { id: 'memory-store' },
	} as never;

	beforeEach(() => {
		jest.clearAllMocks();
		MCPClient.mockImplementation(() => ({
			listTools: jest.fn().mockResolvedValue({}),
		}));
		createToolsFromLocalMcpServer.mockReturnValue({});
	});

	it('creates a fresh deferred tool processor for each run-scoped toolset', async () => {
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
		Agent.mockClear();
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
			// Exercise the deprecated field to confirm it is ignored.
			workspace: fakeWorkspace,
		} as never);

		expect(Agent).toHaveBeenCalledTimes(1);
		const calls = Agent.mock.calls as Array<[Record<string, unknown>]>;
		const firstCall = calls[0];
		expect(firstCall).toBeDefined();
		expect(firstCall[0]).not.toHaveProperty('workspace');
	});

	it('keeps local gateway tools from shadowing native tools', async () => {
		createToolsFromLocalMcpServer.mockReturnValue({
			workflows: { id: 'local-workflows' },
			read_file: { id: 'local-read-file' },
		});
		const logger = { warn: jest.fn() };

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'run-local',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				logger,
				localMcpServer: {
					getToolsByCategory: jest.fn().mockReturnValue([]),
				},
			},
			orchestrationContext: {
				runId: 'run-local',
				browserMcpConfig: undefined,
			},
			memoryConfig,
			disableDeferredTools: true,
		} as never);

		const agentConfig = getLastAgentConfig();
		expect(agentConfig.tools.workflows).toEqual({ id: 'workflows-run-local' });
		expect(agentConfig.tools.read_file).toEqual({ id: 'local-read-file' });
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped MCP tool with unsafe name',
			expect.objectContaining({
				source: 'local gateway MCP',
				toolName: 'workflows',
			}),
		);
	});

	it('rejects normalized lookalike names from external MCP tools', async () => {
		MCPClient.mockImplementation(() => ({
			listTools: jest.fn().mockResolvedValue({
				ＰＬＡＮ: { id: 'external-plan' },
				custom_tool: { id: 'external-custom' },
			}),
		}));
		const logger = { warn: jest.fn() };

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'run-external',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
				logger,
			},
			orchestrationContext: {
				runId: 'run-external',
				browserMcpConfig: undefined,
			},
			mcpServers: [{ name: 'test-server', command: 'test-command-run-external' }],
			memoryConfig,
			disableDeferredTools: true,
		} as never);

		const agentConfig = getLastAgentConfig();
		expect(agentConfig.tools.plan).toEqual({ id: 'plan-run-external' });
		expect(agentConfig.tools.custom_tool).toEqual({ id: 'external-custom' });
		expect(agentConfig.tools.ＰＬＡＮ).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped MCP tool with unsafe name',
			expect.objectContaining({
				source: 'external MCP',
				toolName: 'ＰＬＡＮ',
			}),
		);
	});

	it('rejects invalid MCP tool names and collisions across MCP sources', async () => {
		MCPClient.mockImplementation(() => ({
			listTools: jest.fn().mockResolvedValue({
				custom_tool: { id: 'external-custom' },
				'bad tool': { id: 'bad-tool' },
			}),
		}));
		createToolsFromLocalMcpServer.mockReturnValue({
			'custom-tool': { id: 'local-custom' },
		});
		const logger = { warn: jest.fn() };

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'run-collision',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				logger,
				localMcpServer: {
					getToolsByCategory: jest.fn().mockReturnValue([]),
				},
			},
			orchestrationContext: {
				runId: 'run-collision',
				browserMcpConfig: undefined,
			},
			mcpServers: [{ name: 'test-server', command: 'test-command-run-collision' }],
			memoryConfig,
			disableDeferredTools: true,
		} as never);

		const agentConfig = getLastAgentConfig();
		expect(agentConfig.tools.custom_tool).toEqual({ id: 'external-custom' });
		expect(agentConfig.tools['custom-tool']).toBeUndefined();
		expect(agentConfig.tools['bad tool']).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped MCP tool with unsafe name',
			expect.objectContaining({
				source: 'external MCP',
				toolName: 'bad tool',
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped MCP tool with unsafe name',
			expect.objectContaining({
				source: 'local gateway MCP',
				toolName: 'custom-tool',
			}),
		);
	});
});
