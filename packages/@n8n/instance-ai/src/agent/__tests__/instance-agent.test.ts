/* eslint-disable import-x/order */
import type { Mock } from 'vitest';

const mockAgentInstances: Array<{
	model: Mock;
	instructions: Mock;
	tool: Mock;
	deferredTool: Mock;
	skills: Mock;
	checkpoint: Mock;
	memory: Mock;
	telemetry: Mock;
	workspace: Mock;
}> = [];

const mockMemoryBuilder = {
	storage: vi.fn(),
	observationalMemory: vi.fn(),
	build: vi.fn(),
};

vi.mock('@n8n/agents', () => ({
	Agent: vi.fn().mockImplementation(function Agent(this: (typeof mockAgentInstances)[number]) {
		this.model = vi.fn().mockReturnThis();
		this.instructions = vi.fn().mockReturnThis();
		this.tool = vi.fn().mockReturnThis();
		this.deferredTool = vi.fn().mockReturnThis();
		this.skills = vi.fn().mockReturnThis();
		this.checkpoint = vi.fn().mockReturnThis();
		this.memory = vi.fn().mockReturnThis();
		this.telemetry = vi.fn().mockReturnThis();
		this.workspace = vi.fn().mockReturnThis();
		mockAgentInstances.push(this);
	}),
	Memory: vi.fn().mockImplementation(function Memory() {
		return mockMemoryBuilder;
	}),
}));

const mockBuiltTool = (name: string, marker?: string) => ({
	name,
	description: name,
	handler: vi.fn(),
	marker,
});

vi.mock('../../tools', () => ({
	createAllTools: vi.fn(
		(context: { runLabel?: string }) =>
			new Map([
				['workflows', mockBuiltTool(`workflows-${context.runLabel ?? 'unknown'}`)],
				['evals', mockBuiltTool(`evals-${context.runLabel ?? 'unknown'}`)],
				['research', mockBuiltTool(`research-${context.runLabel ?? 'unknown'}`)],
				['nodes', mockBuiltTool(`nodes-${context.runLabel ?? 'unknown'}`)],
			]),
	),
	createOrchestratorDomainTools: vi.fn(
		(context: { runLabel?: string }) =>
			new Map([
				['workflows', mockBuiltTool(`workflows-${context.runLabel ?? 'unknown'}`)],
				['evals', mockBuiltTool(`evals-${context.runLabel ?? 'unknown'}`)],
				['research', mockBuiltTool(`research-${context.runLabel ?? 'unknown'}`)],
				['nodes', mockBuiltTool(`nodes-${context.runLabel ?? 'unknown'}`)],
				['executions', mockBuiltTool(`executions-${context.runLabel ?? 'unknown'}`)],
				['build-workflow', mockBuiltTool(`build-workflow-${context.runLabel ?? 'unknown'}`)],
			]),
	),
	createOrchestrationTools: vi.fn(
		(context: { runId: string }) =>
			new Map([
				['create-tasks', mockBuiltTool(`create-tasks-${context.runId}`)],
				['complete-checkpoint', mockBuiltTool(`complete-checkpoint-${context.runId}`)],
				['verify-built-workflow', mockBuiltTool(`verify-built-workflow-${context.runId}`)],
			]),
	),
}));

vi.mock('../../tools/filesystem/create-tools-from-mcp-server', () => ({
	createToolsFromLocalMcpServer: vi.fn().mockReturnValue(new Map()),
}));

vi.mock('../../tracing/langsmith-tracing', () => ({
	buildAgentTraceInputs: vi.fn().mockReturnValue({}),
	mergeTraceRunInputs: vi.fn(),
}));

vi.mock('../system-prompt', () => ({
	getSystemPrompt: vi.fn().mockReturnValue('system prompt'),
}));

import { Agent as AgentImport, Memory as MemoryImport } from '@n8n/agents';

import { createOrchestratorDomainTools as createOrchestratorDomainToolsImport } from '../../tools';
import { createToolsFromLocalMcpServer as createToolsFromLocalMcpServerImport } from '../../tools/filesystem/create-tools-from-mcp-server';
import { createInstanceAgent } from '../instance-agent';

const Agent = AgentImport as unknown as Mock;
const Memory = MemoryImport as unknown as Mock;
const createToolsFromLocalMcpServer = createToolsFromLocalMcpServerImport as unknown as Mock;
const createOrchestratorDomainTools = createOrchestratorDomainToolsImport as unknown as Mock;

function createMcpManagerStub(
	regularTools: Map<string, ReturnType<typeof mockBuiltTool>> = new Map(),
) {
	return {
		getRegularTools: vi.fn().mockResolvedValue(regularTools),
		disconnect: vi.fn().mockResolvedValue(undefined),
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
		Agent.mockClear();
		Memory.mockClear();
		mockMemoryBuilder.storage.mockReset().mockReturnValue(mockMemoryBuilder);
		mockMemoryBuilder.observationalMemory.mockReset().mockReturnValue(mockMemoryBuilder);
		mockMemoryBuilder.build.mockReset().mockReturnValue({
			memory: {},
		});
		mockAgentInstances.length = 0;
		createToolsFromLocalMcpServer.mockReset();
		createToolsFromLocalMcpServer.mockReturnValue(new Map());
	});

	it('attaches a fresh native toolset for each run-scoped orchestrator agent', async () => {
		const memoryConfig = {} as never;

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
		const secondRunAttachedTools = getAttachedTools(1);
		expect(attachedTools['create-tasks-run-1']).toMatchObject({ name: 'create-tasks-run-1' });
		expect(attachedTools['plan-run-1']).toBeUndefined();
		expect(attachedTools['research-run-1']).toMatchObject({ name: 'research-run-1' });
		expect(attachedTools['build-workflow-run-1']).toMatchObject({
			name: 'build-workflow-run-1',
		});
		expect(attachedTools['workflows-run-1']).toMatchObject({ name: 'workflows-run-1' });
		expect(attachedTools['verify-built-workflow-run-1']).toMatchObject({
			name: 'verify-built-workflow-run-1',
		});
		expect(attachedTools['nodes-run-1']).toMatchObject({ name: 'nodes-run-1' });
		expect(secondRunAttachedTools['nodes-run-2']).toMatchObject({ name: 'nodes-run-2' });
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
			memoryConfig: {},
			mcpManager: createMcpManagerStub(),
		} as never);

		const attachedTools = getAttachedTools();
		const deferredTools = getDeferredTools();

		expect(attachedTools['complete-checkpoint-checkpoint-run']).toMatchObject({
			name: 'complete-checkpoint-checkpoint-run',
		});
		expect(deferredTools['complete-checkpoint-checkpoint-run']).toBeUndefined();
	});

	it('keeps workflow-builder skill tool names always loaded', async () => {
		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'builder-skill-run',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'builder-skill-run',
			},
			memoryConfig: { lastMessages: 20 },
			mcpManager: createMcpManagerStub(),
		} as never);

		const attachedTools = getAttachedTools();
		const deferredTools = getDeferredTools();

		for (const toolName of ['build-workflow', 'nodes', 'executions']) {
			const scopedName = `${toolName}-builder-skill-run`;
			expect(attachedTools[scopedName]).toMatchObject({ name: scopedName });
			expect(deferredTools[scopedName]).toBeUndefined();
		}
	});

	it('attaches the orchestration workspace when provided', async () => {
		const memoryConfig = {} as never;
		const fakeWorkspace = { id: 'thread-runtime-workspace' } as never;

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
		} as never);

		expect(Agent).toHaveBeenCalledWith('n8n-instance-agent');
		expect(mockAgentInstances[0]?.workspace).toHaveBeenCalledWith(fakeWorkspace);
	});

	it('does not attach a workspace when orchestration context has none', async () => {
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
			},
			memoryConfig: {},
			mcpManager: createMcpManagerStub(),
		} as never);

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
					getTelemetry: vi.fn().mockReturnValue(telemetry),
					wrapTools: vi.fn((tools: unknown) => tools),
				},
			},
			memoryConfig: {},
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
			loadSkill: vi.fn(),
		};

		await createInstanceAgent({
			modelId: 'test-model',
			context: {
				runLabel: 'skills-test',
				localGatewayStatus: undefined,
				licenseHints: undefined,
				localMcpServer: undefined,
			},
			orchestrationContext: {
				runId: 'skills-test',
				runtimeSkills,
			},
			memoryConfig: {},
			mcpManager: createMcpManagerStub(),
		} as never);

		expect(mockAgentInstances[0]?.skills).toHaveBeenCalledWith(runtimeSkills);
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
			getToolsByCategory: vi
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
		const memoryConfig = {} as never;
		const localMcpServer = {
			getToolsByCategory: vi.fn().mockReturnValue([]),
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
		const memoryConfig = {} as never;

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
				observationalMemory: {
					observerThresholdTokens: 30_000,
					reflectorThresholdTokens: 40_000,
				},
			},
			mcpManager: createMcpManagerStub(),
		} as never);

		expect(Memory).toHaveBeenCalledTimes(1);
		expect(mockMemoryBuilder.storage).toHaveBeenCalledWith(memoryStore);
		expect(mockMemoryBuilder.observationalMemory).toHaveBeenCalledWith({
			observerThresholdTokens: 30_000,
			reflectorThresholdTokens: 40_000,
		});
		expect(mockAgentInstances[0]?.memory).toHaveBeenCalledWith(mockMemoryBuilder);
	});
});
