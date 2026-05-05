const mockAgentInstances: Array<{
	model: jest.Mock;
	instructions: jest.Mock;
	tool: jest.Mock;
	checkpoint: jest.Mock;
	memory: jest.Mock;
}> = [];

jest.mock('@n8n/agents', () => ({
	Agent: jest.fn().mockImplementation(function Agent(this: (typeof mockAgentInstances)[number]) {
		this.model = jest.fn().mockReturnThis();
		this.instructions = jest.fn().mockReturnThis();
		this.tool = jest.fn().mockReturnThis();
		this.checkpoint = jest.fn().mockReturnThis();
		this.memory = jest.fn().mockReturnThis();
		mockAgentInstances.push(this);
	}),
}));

const mockBuiltTool = (name: string) => ({
	name,
	description: name,
	handler: jest.fn(),
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
	require('@n8n/agents') as { Agent: jest.Mock };

describe('createInstanceAgent', () => {
	beforeEach(() => {
		Agent.mockClear();
		mockAgentInstances.length = 0;
	});

	it('attaches a fresh native toolset for each run-scoped orchestrator agent', async () => {
		const memoryConfig = {
			lastMessages: 20,
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
});
