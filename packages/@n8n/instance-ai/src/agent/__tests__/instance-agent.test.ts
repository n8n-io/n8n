import type { RuntimeSkillSource } from '@n8n/agents';

const mockAgentInstances: Array<{
	model: jest.Mock;
	instructions: jest.Mock;
	tool: jest.Mock;
	deferredTool: jest.Mock;
	skills: jest.Mock;
	checkpoint: jest.Mock;
	memory: jest.Mock;
	telemetry: jest.Mock;
	workspace: jest.Mock;
}> = [];

const mockMemoryBuilder = {
	storage: jest.fn(),
	lastMessages: jest.fn(),
	observationalMemory: jest.fn(),
	build: jest.fn(),
};

function mockAgentImplementation(this: (typeof mockAgentInstances)[number]) {
	this.model = jest.fn().mockReturnThis();
	this.instructions = jest.fn().mockReturnThis();
	this.tool = jest.fn().mockReturnThis();
	this.deferredTool = jest.fn().mockReturnThis();
	this.skills = jest.fn().mockReturnThis();
	this.checkpoint = jest.fn().mockReturnThis();
	this.memory = jest.fn().mockReturnThis();
	this.telemetry = jest.fn().mockReturnThis();
	this.workspace = jest.fn().mockReturnThis();
	mockAgentInstances.push(this);
}

function mockMemoryImplementation() {
	return mockMemoryBuilder;
}

jest.mock('@n8n/agents', () => ({
	Agent: jest.fn().mockImplementation(mockAgentImplementation),
	Memory: jest.fn().mockImplementation(mockMemoryImplementation),
}));

const mockBuiltTool = (name: string, marker?: string) => ({
	name,
	description: name,
	handler: jest.fn(),
	marker,
});

const mockCreateAllToolMap = (context: { runLabel?: string }) =>
	new Map([
		['workflows', mockBuiltTool(`workflows-${context.runLabel ?? 'unknown'}`)],
		['evals', mockBuiltTool(`evals-${context.runLabel ?? 'unknown'}`)],
		['research', mockBuiltTool(`research-${context.runLabel ?? 'unknown'}`)],
		['nodes', mockBuiltTool(`nodes-${context.runLabel ?? 'unknown'}`)],
	]);

const mockCreateOrchestratorToolMap = (context: { runLabel?: string }) =>
	new Map([
		['workflows', mockBuiltTool(`workflows-${context.runLabel ?? 'unknown'}`)],
		['evals', mockBuiltTool(`evals-${context.runLabel ?? 'unknown'}`)],
		['research', mockBuiltTool(`research-${context.runLabel ?? 'unknown'}`)],
		['nodes', mockBuiltTool(`nodes-${context.runLabel ?? 'unknown'}`)],
		['executions', mockBuiltTool(`executions-${context.runLabel ?? 'unknown'}`)],
	]);

const mockCreateOrchestrationToolMap = (context: { runId: string }) =>
	new Map([
		['plan', mockBuiltTool(`plan-${context.runId}`)],
		['create-tasks', mockBuiltTool(`create-tasks-${context.runId}`)],
		['complete-checkpoint', mockBuiltTool(`complete-checkpoint-${context.runId}`)],
		['verify-built-workflow', mockBuiltTool(`verify-built-workflow-${context.runId}`)],
	]);

jest.mock('../../tools', () => ({
	createAllTools: jest.fn(mockCreateAllToolMap),
	createOrchestratorDomainTools: jest.fn(mockCreateOrchestratorToolMap),
	createOrchestrationTools: jest.fn(mockCreateOrchestrationToolMap),
}));

jest.mock('../../tools/filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: jest.fn().mockReturnValue(new Map()),
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
const { Agent, Memory } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('@n8n/agents') as {
		Agent: jest.Mock;
		Memory: jest.Mock;
	};
const { createToolsFromLocalMcpServer } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools/filesystem/create-tools-from-mcp-server') as {
		createToolsFromLocalMcpServer: jest.Mock;
	};
const { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require('../../tools') as {
		createAllTools: jest.Mock;
		createOrchestratorDomainTools: jest.Mock;
		createOrchestrationTools: jest.Mock;
	};

function createMcpManagerStub(
	regularTools: Map<string, ReturnType<typeof mockBuiltTool>> = new Map(),
) {
	return {
		getRegularTools: jest.fn().mockResolvedValue(regularTools),
		disconnect: jest.fn().mockResolvedValue(undefined),
	};
}

function getAttachedTools(agentIndex = 0) {
	const instance = mockAgentInstances[agentIndex];
	const calls = (instance?.tool.mock.calls ?? []) as unknown as Array<
		[Array<Record<string, unknown>>]
	>;
	const tools = calls[0]?.[0];
	return Object.fromEntries((tools ?? []).map((tool) => [getToolKey(tool), tool]));
}

function getDeferredTools(agentIndex = 0) {
	const instance = mockAgentInstances[agentIndex];
	const calls = (instance?.deferredTool.mock.calls ?? []) as unknown as Array<
		[Array<Record<string, unknown>>, unknown]
	>;
	const tools = calls[0]?.[0];
	return Object.fromEntries((tools ?? []).map((tool) => [getToolKey(tool), tool]));
}

function getToolKey(tool: Record<string, unknown>) {
	if (typeof tool.name === 'string') return tool.name;
	if (typeof tool.id === 'string') return tool.id;
	return 'unknown';
}

describe('createInstanceAgent', () => {
	beforeEach(() => {
		Agent.mockReset().mockImplementation(mockAgentImplementation);
		Memory.mockReset().mockImplementation(mockMemoryImplementation);
		mockMemoryBuilder.storage.mockReset().mockReturnValue(mockMemoryBuilder);
		mockMemoryBuilder.lastMessages.mockReset().mockReturnValue(mockMemoryBuilder);
		mockMemoryBuilder.observationalMemory.mockReset().mockReturnValue(mockMemoryBuilder);
		mockMemoryBuilder.build.mockReset().mockReturnValue({
			memory: {},
			lastMessages: 20,
		});
		mockAgentInstances.length = 0;
		createAllTools.mockReset().mockImplementation(mockCreateAllToolMap);
		createOrchestratorDomainTools.mockReset().mockImplementation(mockCreateOrchestratorToolMap);
		createOrchestrationTools.mockReset().mockImplementation(mockCreateOrchestrationToolMap);
		createToolsFromLocalMcpServer.mockReset();
		createToolsFromLocalMcpServer.mockReturnValue(new Map());
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
				},
				memoryConfig,
				mcpManager,
			}) as never;

		await createInstanceAgent(createOptions('run-1'));
		await createInstanceAgent(createOptions('run-2'));

		expect(Agent).toHaveBeenCalledTimes(2);
		const attachedTools = getAttachedTools();
		expect(attachedTools['plan-run-1']).toMatchObject({ name: 'plan-run-1' });
		expect(attachedTools['research-run-1']).toMatchObject({ name: 'research-run-1' });
		expect(attachedTools['workflows-run-1']).toMatchObject({ name: 'workflows-run-1' });
		expect(attachedTools['verify-built-workflow-run-1']).toMatchObject({
			name: 'verify-built-workflow-run-1',
		});
		expect(mockAgentInstances[0]?.deferredTool).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ name: 'nodes-run-1' })]),
			{ search: { topK: 5 } },
		);
		expect(mockAgentInstances[1]?.deferredTool).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ name: 'nodes-run-2' })]),
			{ search: { topK: 5 } },
		);
	});

	it('eager-loads checkpoint settlement tools only for checkpoint follow-up runs', async () => {
		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'checkpoint-run',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'checkpoint-run',
				isCheckpointFollowUp: true,
			},
			memoryConfig: { lastMessages: 20 },
			mcpManager: createMcpManagerStub(),
		} as never);

		const attachedTools = getAttachedTools();
		const deferredTools = getDeferredTools();

		expect(attachedTools['complete-checkpoint-checkpoint-run']).toMatchObject({
			name: 'complete-checkpoint-checkpoint-run',
		});
		expect(attachedTools['executions-checkpoint-run']).toMatchObject({
			name: 'executions-checkpoint-run',
		});
		expect(deferredTools['complete-checkpoint-checkpoint-run']).toBeUndefined();
		expect(deferredTools['executions-checkpoint-run']).toBeUndefined();
	});

	it('eager-loads node browsing for planned workflow build follow-up runs', async () => {
		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'planned-build-run',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
				plannedBuildTask: {
					threadId: 'thread-1',
					taskId: 'build-1',
					workItemId: 'wi-1',
					title: 'Build workflow',
					spec: 'Build it',
					plannedTaskService: {},
				},
			},
			orchestrationContext: {
				runId: 'planned-build-run',
				browserMcpConfig: undefined,
			},
			memoryConfig: { lastMessages: 20 },
			mcpManager: createMcpManagerStub(),
		} as never);

		const attachedTools = getAttachedTools();
		const deferredTools = getDeferredTools();

		expect(attachedTools['nodes-planned-build-run']).toMatchObject({
			name: 'nodes-planned-build-run',
		});
		expect(deferredTools['nodes-planned-build-run']).toBeUndefined();
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
				workspace: fakeWorkspace,
			},
			memoryConfig,
			mcpManager: createMcpManagerStub(),
			workspace: fakeWorkspace,
		} as never);

		expect(Agent).toHaveBeenCalledWith('n8n-instance-agent');
		expect(mockAgentInstances[0]?.workspace).not.toHaveBeenCalled();
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

	it('attaches runtime skills to the orchestrator when provided by the context', async () => {
		const runtimeSkills = {
			registry: {
				schemaVersion: 1,
				skillsHash: 'skills-hash',
				skills: [
					{
						id: 'data-table-manager',
						name: 'data-table-manager',
						description: 'Manage data tables.',
						hash: 'skill-hash',
						linkedFiles: {
							references: [],
							templates: [],
							scripts: [],
							assets: [],
							examples: [],
							other: [],
						},
					},
				],
			},
			loadSkill: jest.fn(
				async (skillId: string) =>
					await Promise.resolve({
						id: skillId,
						name: skillId,
						description: 'Loaded skill.',
						instructions: 'Loaded skill.',
					}),
			),
		};
		const context = {
			runLabel: 'skills-test',
			localGatewayStatus: undefined,
			licenseHints: undefined,
			localMcpServer: undefined,
			loadedSkills: undefined as Set<string> | undefined,
		};

		await createInstanceAgent({
			modelId: 'test-model',
			context,
			orchestrationContext: {
				runId: 'skills-test',
				browserMcpConfig: undefined,
				runtimeSkills,
			},
			memoryConfig: { lastMessages: 20 },
			mcpManager: createMcpManagerStub(),
		} as never);

		const skillsCalls = (mockAgentInstances[0]?.skills.mock.calls ?? []) as unknown as Array<
			[RuntimeSkillSource]
		>;
		const trackedRuntimeSkills = skillsCalls[0]?.[0];
		if (!trackedRuntimeSkills) throw new Error('Expected runtime skills to be attached');

		expect(trackedRuntimeSkills).not.toBe(runtimeSkills);
		expect(trackedRuntimeSkills.registry).toBe(runtimeSkills.registry);
		await trackedRuntimeSkills.loadSkill('data-table-manager');

		expect(context.loadedSkills).toEqual(new Set(['data-table-manager']));
	});

	it('tracks when the orchestrator loads the workflow-builder skill', async () => {
		const loadedSkills = new Set<string>();
		const runtimeSkills = {
			registry: {
				schemaVersion: 1,
				skillsHash: 'skills-hash',
				skills: [
					{
						id: 'workflow-builder',
						name: 'workflow-builder',
						description: 'Build workflows.',
						hash: 'skill-hash',
						linkedFiles: {
							references: [],
							templates: [],
							scripts: [],
							assets: [],
							examples: [],
							other: [],
						},
					},
				],
			},
			loadSkill: jest.fn(
				async (skillId: string) =>
					await Promise.resolve({
						id: skillId,
						name: 'workflow-builder',
						description: 'Build workflows.',
						instructions: 'Build workflows.',
					}),
			),
		};

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'skills-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
				loadedSkills,
			},
			orchestrationContext: {
				runId: 'skills-test',
				runtimeSkills,
			},
			memoryConfig: { lastMessages: 20 },
			mcpManager: createMcpManagerStub(),
		} as never);

		const skillsCalls = (mockAgentInstances[0]?.skills.mock.calls ?? []) as unknown as Array<
			[RuntimeSkillSource]
		>;
		const trackedRuntimeSkills = skillsCalls[0]?.[0];
		if (!trackedRuntimeSkills) throw new Error('Expected runtime skills to be attached');
		await trackedRuntimeSkills.loadSkill('workflow-builder');

		expect(loadedSkills.has('workflow-builder')).toBe(true);
	});

	it('exposes browser_connect and browser_navigate from localMcpServer in the agent toolset', async () => {
		createOrchestratorDomainTools.mockReturnValueOnce(
			new Map([['workflows', { id: 'workflows' }]]),
		);
		createToolsFromLocalMcpServer.mockReturnValue(
			new Map([
				['browser_connect', { id: 'browser_connect' }],
				['browser_navigate', { id: 'browser_navigate' }],
			]),
		);

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
			orchestrationContext: { runId: 'browser-test' },
			memoryConfig,
			mcpManager: createMcpManagerStub(),
			disableDeferredTools: true,
		} as never);

		const agentTools = getAttachedTools();
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
		const localTools = new Map([['shared_tool', mockBuiltTool('shared_tool', 'local-shared')]]);
		const externalTools = new Map([
			['shared_tool', mockBuiltTool('shared_tool', 'external-shared')],
			['github_workflows', mockBuiltTool('github_workflows', 'github-workflows')],
			['custom_plan', mockBuiltTool('custom_plan', 'custom-plan')],
		]);
		const orchestrationContext: Record<string, unknown> = {
			runId: 'local-priority',
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

		const agentTools = getDeferredTools();
		const mcpContextTools = orchestrationContext.mcpTools as Map<
			string,
			ReturnType<typeof mockBuiltTool>
		>;

		expect(agentTools.shared_tool).toMatchObject({ marker: 'local-shared' });
		expect(agentTools.github_workflows).toMatchObject({ marker: 'github-workflows' });
		expect(agentTools.custom_plan).toMatchObject({ marker: 'custom-plan' });
		expect(mcpContextTools.get('shared_tool')).toMatchObject({ marker: 'local-shared' });
		expect(mcpContextTools.get('github_workflows')).toMatchObject({ marker: 'github-workflows' });
	});

	it('keeps evals always loaded so user-requested eval setup can route directly', async () => {
		const memoryConfig = { lastMessages: 20 } as never;

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'evals-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'evals-test',
			},
			memoryConfig,
			mcpManager: createMcpManagerStub(),
		} as never);

		const attachedTools = getAttachedTools();
		const deferredTools = getDeferredTools();

		expect(attachedTools['evals-evals-test']).toMatchObject({
			name: 'evals-evals-test',
		});
		expect(deferredTools['evals-evals-test']).toBeUndefined();
	});

	it('configures observational memory on the Memory builder when provided', async () => {
		const memoryStore = { id: 'memory-store' };

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'memory-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'memory-test',
			},
			memory: memoryStore,
			memoryConfig: {
				lastMessages: 15,
				observationalMemory: {
					observerThresholdTokens: 30_000,
					reflectorThresholdTokens: 40_000,
				},
			},
			mcpManager: createMcpManagerStub(),
		} as never);

		expect(Memory).toHaveBeenCalledTimes(1);
		expect(mockMemoryBuilder.storage).toHaveBeenCalledWith(memoryStore);
		expect(mockMemoryBuilder.lastMessages).toHaveBeenCalledWith(15);
		expect(mockMemoryBuilder.observationalMemory).toHaveBeenCalledWith({
			observerThresholdTokens: 30_000,
			reflectorThresholdTokens: 40_000,
		});
		expect(mockAgentInstances[0]?.memory).toHaveBeenCalledWith(mockMemoryBuilder);
	});
});
