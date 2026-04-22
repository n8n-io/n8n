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
const { ToolSearchProcessor } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@mastra/core/processors') as {
		ToolSearchProcessor: jest.Mock;
	};

describe('createInstanceAgent', () => {
	it('creates a fresh deferred tool processor for each run-scoped toolset', async () => {
		const memoryConfig = {
			storage: { id: 'memory-store' },
		} as never;

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
});
