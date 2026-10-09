import type { BuiltTelemetry, BuiltTool, CredentialProvider, StreamChunk } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { NodeCatalogService } from '@/node-catalog';

import type { InstanceAiCreditService } from '../../../instance-ai/instance-ai-credit.service';
import type { StartExecutionParams } from '../../agent-execution.service';
import type { AgentTurnExecutionService } from '../../agent-turn-execution.service';
import type { AgentsService } from '../../agents.service';
import { ExecutionRecorder } from '../../execution-recorder';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { ProjectAgent } from '../../entities/agent.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { N8nMemory, N8nMemoryImpl } from '../../integrations/n8n-memory';
import type { AgentsBuilderToolsService } from '../agents-builder-tools.service';
import { AgentsBuilderService } from '../agents-builder.service';

const aiConfigMock = mock<AiConfig>();

// The `Agent`/`Memory` SDK classes and observational-memory factories are
// imported inside `agents-builder.service.ts` from `@n8n/agents`. Stubbing
// them here lets us capture the persistence/memory options passed to the
// runtime without standing up a real model/tool/telemetry stack.
const agentsSdkMocks = vi.hoisted(() => {
	const streamCalls: Array<{
		message: unknown;
		options: {
			persistence: {
				threadId: string;
				resourceId: string;
				hostMetadata?: Record<string, unknown>;
			};
			abortSignal?: AbortSignal;
			executionCounter?: unknown;
		};
	}> = [];
	/** Chunks that the next stream or resume call emits. */
	const nextChunks: StreamChunk[] = [];
	const resumeCalls: Array<{ options: Record<string, unknown> }> = [];
	const instructionsCalls: string[] = [];
	const volatileInstructionsProviders: Array<() => Promise<string | undefined>> = [];
	const registeredToolNames: string[] = [];
	const modelCalls: unknown[] = [];
	const configurationCalls: Array<{ maxIterations?: number }> = [];
	const promptCachingCalls: unknown[] = [];
	const reasoningCalls: string[] = [];
	const telemetryCalls: unknown[] = [];
	const memoryTaskObserverCalls: unknown[] = [];
	const observationalMemoryCalls: Array<{
		observe: { model: unknown; options: { onUsage: (report: unknown) => Promise<void> } };
		reflect: { model: unknown; options: { onUsage: (report: unknown) => Promise<void> } };
	}> = [];

	function emptyStream() {
		const chunks = nextChunks.splice(0);
		return new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
		});
	}

	class MockAgent {
		constructor(_name: string) {}
		model(config: unknown) {
			modelCalls.push(config);
			return this;
		}
		promptCaching(config?: unknown) {
			promptCachingCalls.push(config);
			return this;
		}
		reasoning(effort: string) {
			reasoningCalls.push(effort);
			return this;
		}
		instructions(text: string) {
			instructionsCalls.push(text);
			return this;
		}
		volatileInstructionsProvider(provider: () => Promise<string | undefined>) {
			volatileInstructionsProviders.push(provider);
			return this;
		}
		skills(_skills: unknown) {
			return this;
		}
		memory() {
			return this;
		}
		checkpoint() {
			return this;
		}
		configuration(config: { maxIterations?: number }) {
			configurationCalls.push(config);
			return this;
		}
		telemetry(t: unknown) {
			telemetryCalls.push(t);
			return this;
		}
		memoryTaskObserver(observer: unknown) {
			memoryTaskObserverCalls.push(observer);
			return this;
		}
		tool(tool: BuiltTool) {
			registeredToolNames.push(tool.name);
			return this;
		}
		async stream(message: unknown, options: (typeof streamCalls)[number]['options']) {
			streamCalls.push({ message, options });
			return { stream: emptyStream() };
		}
		async resume(_mode: string, _resumeData: unknown, options: Record<string, unknown>) {
			resumeCalls.push({ options });
			if (typeof options.onResumeClaimed === 'function') await options.onResumeClaimed();
			return { stream: emptyStream() };
		}
	}

	class MockMemory {
		storage() {
			return this;
		}
		observationalMemory(options: unknown) {
			observationalMemoryCalls.push(options as (typeof observationalMemoryCalls)[number]);
			return this;
		}
	}

	function createObservationLogObserveFn(model: unknown, options: unknown) {
		return { model, options, kind: 'observe' };
	}
	function createObservationLogReflectFn(model: unknown, options: unknown) {
		return { model, options, kind: 'reflect' };
	}

	function createPlannerTodosTool(): BuiltTool {
		return { name: 'write_todos', description: 'planner todos tool' } as BuiltTool;
	}

	return {
		streamCalls,
		nextChunks,
		resumeCalls,
		instructionsCalls,
		volatileInstructionsProviders,
		registeredToolNames,
		modelCalls,
		configurationCalls,
		promptCachingCalls,
		reasoningCalls,
		telemetryCalls,
		memoryTaskObserverCalls,
		observationalMemoryCalls,
		MockAgent,
		MockMemory,
		createObservationLogObserveFn,
		createObservationLogReflectFn,
		createPlannerTodosTool,
	};
});

vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	Agent: agentsSdkMocks.MockAgent,
	Memory: agentsSdkMocks.MockMemory,
	createObservationLogObserveFn: agentsSdkMocks.createObservationLogObserveFn,
	createObservationLogReflectFn: agentsSdkMocks.createObservationLogReflectFn,
	createPlannerTodosTool: agentsSdkMocks.createPlannerTodosTool,
}));

// Avoid a real `models.dev` catalog fetch — irrelevant to thread isolation and
// would otherwise hit the network (or a 5s timeout) on every test run.
vi.mock('../agents-builder-model-recommendations', () => ({
	getModelRecommendationsSection: vi.fn(async () => null),
}));

async function drain<T>(generator: AsyncGenerator<T>): Promise<T[]> {
	const values: T[] = [];
	for await (const value of generator) values.push(value);
	return values;
}

/** Minimal `BuiltTool` stand-in — only `name` is read by the code under test. */
function fakeTool(name: string): BuiltTool {
	return { name, description: `${name} description` } as BuiltTool;
}

function setup(
	standardTools: { json: BuiltTool[]; shared: BuiltTool[] } = { json: [], shared: [] },
) {
	const logger = mock<Logger>();
	const agentsService = mock<AgentsService>();
	const nodeCatalogService = mock<NodeCatalogService>();
	const agentsBuilderToolsService = mock<AgentsBuilderToolsService>();
	const n8nMemory = mock<N8nMemory>();
	const instanceAiCreditService = mock<InstanceAiCreditService>();
	const n8nCheckpointStorage = mock<N8NCheckpointStorage>();
	const turnExecutionService = mock<AgentTurnExecutionService>();
	const executionRepository = mock<AgentExecutionRepository>();
	turnExecutionService.createRecorder.mockImplementation(() => new ExecutionRecorder());
	turnExecutionService.startExecution.mockResolvedValue({
		executionId: 'builder-execution-1',
		startedAt: new Date(),
		inputMessageIds: ['input-message-1'],
	});
	executionRepository.findLinksForChildOf.mockResolvedValue({
		parentExecutionId: 'parent-execution-1',
		rootExecutionId: 'root-execution-1',
	});

	nodeCatalogService.initialize.mockResolvedValue(undefined);
	agentsBuilderToolsService.getTools.mockReturnValue(standardTools);

	const memoryImplementation = mock<N8nMemoryImpl>();
	memoryImplementation.getMessages.mockResolvedValue([]);
	n8nMemory.getImplementation.mockReturnValue(memoryImplementation);

	const agent = mock<ProjectAgent>({
		id: 'agent-1',
		name: 'Support agent',
		schema: null,
		integrations: [],
		tools: {},
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
	});
	agentsService.findById.mockResolvedValue(agent);

	const service = new AgentsBuilderService(
		logger,
		agentsService,
		nodeCatalogService,
		agentsBuilderToolsService,
		n8nMemory,
		instanceAiCreditService,
		n8nCheckpointStorage,
		aiConfigMock,
		turnExecutionService,
		executionRepository,
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();
	const credentialService = mock<InstanceAiCredentialService>();
	return {
		service,
		logger,
		n8nMemory,
		memoryImplementation,
		user,
		credentialProvider,
		agentsBuilderToolsService,
		instanceAiCreditService,
		n8nCheckpointStorage,
		credentialService,
		turnExecutionService,
		executionRepository,
	};
}

const baseSession = {
	threadId: 'ia-builder:t:agent-1',
	hostThreadId: 'instance-thread-1',
	runId: 'run-1',
	modelConfig: 'anthropic/claude-sonnet-host-resolved',
	abortSignal: new AbortController().signal,
};

describe('AgentsBuilderService session isolation', () => {
	beforeEach(() => {
		agentsSdkMocks.streamCalls.length = 0;
		agentsSdkMocks.nextChunks.length = 0;
		agentsSdkMocks.resumeCalls.length = 0;
		agentsSdkMocks.instructionsCalls.length = 0;
		agentsSdkMocks.volatileInstructionsProviders.length = 0;
		agentsSdkMocks.registeredToolNames.length = 0;
		agentsSdkMocks.modelCalls.length = 0;
		agentsSdkMocks.configurationCalls.length = 0;
		agentsSdkMocks.promptCachingCalls.length = 0;
		agentsSdkMocks.reasoningCalls.length = 0;
		agentsSdkMocks.telemetryCalls.length = 0;
		agentsSdkMocks.memoryTaskObserverCalls.length = 0;
		agentsSdkMocks.observationalMemoryCalls.length = 0;
	});

	it('uses the session threadId for stream persistence', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.streamCalls).toHaveLength(1);
		expect(agentsSdkMocks.streamCalls[0]?.options.persistence.threadId).toBe(
			'ia-builder:t:agent-1',
		);
	});

	it('forwards the eval model catalog option to the builder tools', async () => {
		const { service, user, credentialProvider, credentialService, agentsBuilderToolsService } =
			setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, useEvalModelCatalog: true },
			),
		);

		expect(agentsBuilderToolsService.getTools).toHaveBeenCalledWith(
			'agent-1',
			'project-1',
			credentialProvider,
			credentialService,
			user,
			{
				threadId: 'instance-thread-1',
				runId: 'run-1',
				useEvalModelCatalog: true,
			},
		);
	});

	it('forwards session.abortSignal to the SDK stream and resume calls', async () => {
		const { service, user, credentialProvider, credentialService, n8nCheckpointStorage } = setup();
		n8nCheckpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint: {} as never });
		const abortSignal = new AbortController().signal;

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					abortSignal,
				},
			),
		);
		await drain(
			service.resumeBuild(
				'agent-1',
				'project-1',
				'builder-run-1',
				'tool-call-1',
				{},
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, abortSignal },
			),
		);
		expect(agentsSdkMocks.streamCalls[0]?.options.abortSignal).toBe(abortSignal);
		expect(agentsSdkMocks.resumeCalls[0]?.options.abortSignal).toBe(abortSignal);
		expect(n8nCheckpointStorage.getStatus).toHaveBeenCalledWith('builder-run-1', 'agent-1');
	});

	it('appends the session instructionsAddendum to the built prompt when provided', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					instructionsAddendum: 'Extra sub-agent rules go here.',
				},
			),
		);

		expect(agentsSdkMocks.instructionsCalls).toHaveLength(1);
		const instructions = agentsSdkMocks.instructionsCalls[0] ?? '';
		expect(instructions.endsWith('\n\nExtra sub-agent rules go here.')).toBe(true);
	});

	it('does not append anything to the prompt when instructionsAddendum is absent', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.instructionsCalls).toHaveLength(1);
		expect(agentsSdkMocks.instructionsCalls[0]).not.toContain('Extra sub-agent rules');
	});

	it('registers all standard tools returned by the tools service', async () => {
		const { service, user, credentialProvider, credentialService } = setup({
			json: [fakeTool('resolve_llm')],
			shared: [fakeTool('agent-context'), fakeTool('ask_credential')],
		});

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.registeredToolNames).toEqual(
			expect.arrayContaining(['resolve_llm', 'agent-context', 'ask_credential']),
		);
	});

	it('registers the parent MCP tools for an initial builder turn', async () => {
		const { service, user, credentialProvider, credentialService } = setup();
		const notionSearch = fakeTool('notion_search');

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					mcpTools: new Map([[notionSearch.name, notionSearch]]),
				},
			),
		);

		expect(agentsSdkMocks.registeredToolNames).toContain('notion_search');
	});

	it('registers the parent MCP tools for a resumed builder turn', async () => {
		const { service, user, credentialProvider, credentialService, n8nCheckpointStorage } = setup();
		const notionSearch = fakeTool('notion_search');
		n8nCheckpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint: {} as never });

		await drain(
			service.resumeBuild(
				'agent-1',
				'project-1',
				'builder-run-1',
				'tool-call-1',
				{},
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					mcpTools: new Map([[notionSearch.name, notionSearch]]),
				},
			),
		);

		expect(agentsSdkMocks.registeredToolNames).toContain('notion_search');
	});

	it('does not let an MCP tool replace a native builder tool', async () => {
		const nativeAgentContext = fakeTool('agent-context');
		const mcpAgentContext = fakeTool('agent-context');
		const { service, logger, user, credentialProvider, credentialService } = setup({
			json: [],
			shared: [nativeAgentContext],
		});

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					mcpTools: new Map([[mcpAgentContext.name, mcpAgentContext]]),
				},
			),
		);

		expect(agentsSdkMocks.registeredToolNames.filter((name) => name === 'agent-context')).toEqual([
			'agent-context',
		]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped MCP tool that conflicts with an agent builder tool',
			{ toolName: 'agent-context', agentId: 'agent-1' },
		);
	});

	it('cancelCheckpoint expires the checkpoint scoped to the agent', async () => {
		const { service, n8nCheckpointStorage } = setup();

		await service.cancelCheckpoint('agent-1', 'run-1');

		expect(n8nCheckpointStorage.delete).toHaveBeenCalledWith('run-1', 'agent-1');
	});

	it('uses session.modelConfig directly for the builder model', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.modelCalls).toEqual(['anthropic/claude-sonnet-host-resolved']);
	});

	it('configures the builder agent with a maximum of 100 iterations', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.configurationCalls).toEqual([{ maxIterations: 100 }]);
	});

	it('keeps the per-agent Preview path out of the cached instructions', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.instructionsCalls[0]).not.toContain('/projects/project-1/agents/agent-1');
		expect(agentsSdkMocks.volatileInstructionsProviders).toHaveLength(1);
		const sessionContext = await agentsSdkMocks.volatileInstructionsProviders[0]?.();
		expect(sessionContext).toContain(
			'[Preview](/projects/project-1/agents/agent-1?openPreview=true)',
		);
	});

	it('enables prompt caching with a 5m Anthropic TTL for the builder agent', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.promptCachingCalls).toEqual([
			{ enabled: true, anthropic: { ttl: '5m' } },
		]);
	});

	it('uses low reasoning and skips Anthropic prompt caching for proxied Kimi', async () => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					modelConfig: { provider: 'moonshotai', modelId: 'kimi-k3' } as never,
				},
			),
		);

		expect(agentsSdkMocks.promptCachingCalls).toEqual([]);
		expect(agentsSdkMocks.reasoningCalls).toEqual(['low']);
	});

	it.each([
		['Anthropic', 'anthropic/claude-sonnet-host-resolved'],
		['OpenAI', 'openai/gpt-5.6-sol'],
		['Google', 'google/gemini-2.5-pro'],
	])('enables generic reasoning for a %s builder model', async (_provider, modelConfig) => {
		const { service, user, credentialProvider, credentialService } = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					modelConfig,
				},
			),
		);

		expect(agentsSdkMocks.reasoningCalls).toEqual(['medium']);
	});

	it('attaches session.telemetry when provided, and omits it otherwise', async () => {
		const { service, user, credentialProvider, credentialService } = setup();
		const sentinel = { functionId: 'host' } as unknown as BuiltTelemetry;

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					telemetry: sentinel,
				},
			),
		);
		expect(agentsSdkMocks.telemetryCalls).toEqual([sentinel]);

		agentsSdkMocks.telemetryCalls.length = 0;
		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);
		expect(agentsSdkMocks.telemetryCalls).toEqual([]);
	});

	it('registers session.memoryTaskObserver on the builder agent when provided, and omits it otherwise', async () => {
		const { service, user, credentialProvider, credentialService } = setup();
		const memoryTaskObserver = vi.fn();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					...baseSession,
					memoryTaskObserver,
				},
			),
		);
		expect(agentsSdkMocks.memoryTaskObserverCalls).toEqual([memoryTaskObserver]);

		agentsSdkMocks.memoryTaskObserverCalls.length = 0;
		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);
		expect(agentsSdkMocks.memoryTaskObserverCalls).toEqual([]);
	});

	it('constructs observer/reflector callbacks on the builder model and claims usage under the host thread/run/target-agent dedupe key', async () => {
		const { service, user, credentialProvider, credentialService, instanceAiCreditService } =
			setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(agentsSdkMocks.observationalMemoryCalls).toHaveLength(1);
		const { observe, reflect } = agentsSdkMocks.observationalMemoryCalls[0];
		expect(observe.model).toBe(baseSession.modelConfig);
		expect(reflect.model).toBe(baseSession.modelConfig);

		await observe.options.onUsage({
			task: 'observer',
			model: baseSession.modelConfig,
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		});

		expect(instanceAiCreditService.claimRunUsage).toHaveBeenCalledWith(
			user,
			'instance-thread-1',
			'run-1:agent-builder:agent-1:memory:observer:report-1',
			expect.arrayContaining([expect.objectContaining({ type: 'llmTokens' })]),
			'completed',
		);
	});
});

describe('AgentsBuilderService execution records', () => {
	const executionCounter = {
		incrementMessageCount: vi.fn(),
		incrementToolCallCount: vi.fn(),
		incrementTokenCount: vi.fn(),
	};
	const parentExecution = {
		threadId: 'assistant-thread-1',
		agentId: 'instance-assistant',
		projectId: 'working-project-1',
		executionId: 'parent-execution-1',
		executionCounter,
	};
	const finishChunk = {
		type: 'finish',
		finishReason: 'stop',
		model: 'anthropic/claude-sonnet-host-resolved',
		usage: {
			promptTokens: 120,
			completionTokens: 30,
			totalTokens: 150,
			inputTokenDetails: { cacheRead: 100, cacheWrite: 10 },
		},
	} as StreamChunk;

	beforeEach(() => {
		agentsSdkMocks.streamCalls.length = 0;
		agentsSdkMocks.nextChunks.length = 0;
		agentsSdkMocks.resumeCalls.length = 0;
	});

	function recordedStart(turnExecutionService: ReturnType<typeof setup>['turnExecutionService']) {
		return turnExecutionService.startExecution.mock.calls[0]?.[0] as StartExecutionParams;
	}

	function finalized(turnExecutionService: ReturnType<typeof setup>['turnExecutionService']) {
		return turnExecutionService.finalizeExecution.mock.calls[0]?.[0];
	}

	it('records nothing and keeps the stream options when no parent execution is given', async () => {
		const {
			service,
			user,
			credentialProvider,
			credentialService,
			turnExecutionService,
			executionRepository,
			memoryImplementation,
		} = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(turnExecutionService.startExecution).not.toHaveBeenCalled();
		expect(turnExecutionService.finalizeExecution).not.toHaveBeenCalled();
		expect(executionRepository.findLinksForChildOf).not.toHaveBeenCalled();
		expect(memoryImplementation.saveThread).not.toHaveBeenCalled();
		expect(agentsSdkMocks.streamCalls[0]?.message).toBe('hi');
		expect(agentsSdkMocks.streamCalls[0]?.options).toEqual({
			persistence: { threadId: 'ia-builder:t:agent-1', resourceId: 'user-1' },
			abortSignal: baseSession.abortSignal,
			recoverUsageOnAbort: true,
		});
	});

	it('records nothing for a resume when no parent execution is given', async () => {
		const {
			service,
			user,
			credentialProvider,
			credentialService,
			n8nCheckpointStorage,
			turnExecutionService,
		} = setup();
		n8nCheckpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint: {} as never });

		await drain(
			service.resumeBuild(
				'agent-1',
				'project-1',
				'builder-run-1',
				'tool-call-1',
				{},
				credentialProvider,
				credentialService,
				user,
				baseSession,
			),
		);

		expect(turnExecutionService.startExecution).not.toHaveBeenCalled();
		expect(agentsSdkMocks.resumeCalls[0]?.options).toEqual({
			runId: 'builder-run-1',
			toolCallId: 'tool-call-1',
			abortSignal: baseSession.abortSignal,
			recoverUsageOnAbort: true,
		});
	});

	it('records a start turn under the parent thread and links it to the parent execution', async () => {
		const {
			service,
			user,
			credentialProvider,
			credentialService,
			turnExecutionService,
			executionRepository,
			memoryImplementation,
		} = setup();
		agentsSdkMocks.nextChunks.push(finishChunk);

		const chunks = await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'Build a support agent',
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, parentExecution },
			),
		);

		expect(chunks).toEqual([finishChunk]);
		expect(executionRepository.findLinksForChildOf).toHaveBeenCalledWith('parent-execution-1');
		expect(memoryImplementation.saveThread).toHaveBeenCalledWith({
			id: 'ia-builder:t:agent-1',
			resourceId: 'user-1',
			metadata: { builtAgentId: 'agent-1' },
		});
		// The session belongs to the parent's system agent and working project.
		// Its checkpoints belong to the same agent, so no override is needed.
		expect(recordedStart(turnExecutionService)).toEqual({
			access: { accessScope: 'user', ownerId: 'user-1' },
			threadId: 'ia-builder:t:agent-1',
			agentId: 'instance-assistant',
			agentName: 'agent-builder',
			projectId: 'working-project-1',
			userMessage: 'Build a support agent',
			resourceId: 'user-1',
			source: 'builder',
			executionLinks: {
				parentExecutionId: 'parent-execution-1',
				rootExecutionId: 'root-execution-1',
			},
			threadMetadata: {
				parentThreadId: 'assistant-thread-1',
				parentAgentId: 'instance-assistant',
			},
		});

		const streamCall = agentsSdkMocks.streamCalls[0];
		expect(streamCall?.message).toEqual([
			{
				id: 'input-message-1',
				role: 'user',
				content: [{ type: 'text', text: 'Build a support agent' }],
			},
		]);
		expect(streamCall?.options.persistence).toEqual({
			threadId: 'ia-builder:t:agent-1',
			resourceId: 'user-1',
			hostMetadata: { n8nExecutionId: 'builder-execution-1' },
		});
		expect(streamCall?.options.executionCounter).toBe(executionCounter);
		expect(streamCall?.options).toMatchObject({ recoverUsageOnAbort: true });

		const finalize = finalized(turnExecutionService);
		expect(finalize).toMatchObject({
			executionId: 'builder-execution-1',
			executionStarted: true,
			params: {
				threadId: 'ia-builder:t:agent-1',
				source: 'builder',
				executionLinks: {
					parentExecutionId: 'parent-execution-1',
					rootExecutionId: 'root-execution-1',
				},
				hitlStatus: undefined,
				record: {
					finishReason: 'stop',
					model: 'anthropic/claude-sonnet-host-resolved',
					usage: { promptTokens: 120, completionTokens: 30, totalTokens: 150 },
					cacheReadTokens: 100,
					cacheWriteTokens: 10,
				},
			},
		});
	});

	it('records a resume with the same links and the resumed HITL status', async () => {
		const {
			service,
			user,
			credentialProvider,
			credentialService,
			turnExecutionService,
			n8nCheckpointStorage,
		} = setup();
		n8nCheckpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint: {} as never });
		agentsSdkMocks.nextChunks.push(finishChunk);

		await drain(
			service.resumeBuild(
				'agent-1',
				'project-1',
				'builder-run-1',
				'tool-call-1',
				{ approved: true },
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, parentExecution },
			),
		);

		expect(recordedStart(turnExecutionService)).toMatchObject({
			threadId: 'ia-builder:t:agent-1',
			agentId: 'instance-assistant',
			projectId: 'working-project-1',
			userMessage: null,
			resumeRunId: 'builder-run-1',
			sessionMode: 'existing',
			source: 'builder',
			executionLinks: {
				parentExecutionId: 'parent-execution-1',
				rootExecutionId: 'root-execution-1',
			},
			threadMetadata: {
				parentThreadId: 'assistant-thread-1',
				parentAgentId: 'instance-assistant',
			},
		});
		expect(agentsSdkMocks.resumeCalls[0]?.options).toMatchObject({
			runId: 'builder-run-1',
			toolCallId: 'tool-call-1',
			hostMetadata: { n8nExecutionId: 'builder-execution-1' },
			executionCounter,
			recoverUsageOnAbort: true,
		});
		expect(finalized(turnExecutionService)).toMatchObject({
			executionId: 'builder-execution-1',
			executionStarted: true,
			params: {
				hitlStatus: 'resumed',
				record: { usage: { totalTokens: 150 } },
			},
		});
	});

	it('marks a turn that suspends on a builder question', async () => {
		const { service, user, credentialProvider, credentialService, turnExecutionService } = setup();
		agentsSdkMocks.nextChunks.push({
			type: 'tool-call-suspended',
			runId: 'builder-run-1',
			toolCallId: 'tool-call-1',
			toolName: 'ask_question',
			input: {},
			suspendPayload: {},
		} as StreamChunk);

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, parentExecution },
			),
		);

		expect(finalized(turnExecutionService)?.params.hitlStatus).toBe('suspended');
	});

	it('records a cancelled turn when the host run is stopped', async () => {
		const { service, user, credentialProvider, credentialService, turnExecutionService } = setup();
		const controller = new AbortController();
		agentsSdkMocks.nextChunks.push(finishChunk);
		const stream = service.buildAgent(
			'agent-1',
			'project-1',
			'hi',
			credentialProvider,
			credentialService,
			user,
			{ ...baseSession, abortSignal: controller.signal, parentExecution },
		);

		await stream.next();
		controller.abort();
		await drain(stream);

		expect(finalized(turnExecutionService)?.params.record).toMatchObject({
			finishReason: 'cancelled',
			error: null,
			usage: { totalTokens: 150 },
		});
	});

	it('records a failed turn and rethrows the runtime error', async () => {
		const { service, user, credentialProvider, credentialService, turnExecutionService } = setup();
		const failure = new Error('model unavailable');
		const streamSpy = vi
			.spyOn(agentsSdkMocks.MockAgent.prototype, 'stream')
			.mockRejectedValueOnce(failure);

		await expect(
			drain(
				service.buildAgent(
					'agent-1',
					'project-1',
					'hi',
					credentialProvider,
					credentialService,
					user,
					{ ...baseSession, parentExecution },
				),
			),
		).rejects.toThrow('model unavailable');
		streamSpy.mockRestore();

		expect(finalized(turnExecutionService)).toMatchObject({
			executionId: 'builder-execution-1',
			executionStarted: true,
			executionError: failure,
			params: { record: { finishReason: 'error' } },
		});
	});

	it('records the turn without links when the link lookup fails', async () => {
		const {
			service,
			logger,
			user,
			credentialProvider,
			credentialService,
			turnExecutionService,
			executionRepository,
		} = setup();
		executionRepository.findLinksForChildOf.mockRejectedValue(new Error('db down'));

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, parentExecution },
			),
		);

		expect(recordedStart(turnExecutionService)).not.toHaveProperty('executionLinks');
		expect(turnExecutionService.finalizeExecution).toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to resolve builder execution links',
			expect.objectContaining({ agentId: 'agent-1' }),
		);
	});
});

describe('AgentsBuilderService state owner', () => {
	const parentExecution = {
		threadId: 'assistant-thread-1',
		agentId: 'instance-assistant',
		projectId: 'working-project-1',
		executionId: 'parent-execution-1',
	};

	beforeEach(() => {
		agentsSdkMocks.streamCalls.length = 0;
		agentsSdkMocks.nextChunks.length = 0;
		agentsSdkMocks.resumeCalls.length = 0;
		agentsSdkMocks.observationalMemoryCalls.length = 0;
	});

	it.each([
		{ name: 'the built agent without a parent execution', parent: undefined, owner: 'agent-1' },
		{
			name: 'the parent agent with a parent execution',
			parent: parentExecution,
			owner: 'instance-assistant',
		},
	])('keys checkpoints and memory of a start turn on $name', async ({ parent, owner }) => {
		const {
			service,
			user,
			credentialProvider,
			credentialService,
			n8nCheckpointStorage,
			n8nMemory,
			agentsBuilderToolsService,
		} = setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				parent ? { ...baseSession, parentExecution: parent } : baseSession,
			),
		);

		expect(n8nCheckpointStorage.getStorage).toHaveBeenCalledTimes(1);
		expect(n8nCheckpointStorage.getStorage).toHaveBeenCalledWith(owner);
		expect(n8nMemory.getImplementation.mock.calls.every(([agentId]) => agentId === owner)).toBe(
			true,
		);
		expect(n8nMemory.getImplementation).toHaveBeenCalledWith(owner);
		// The config tools always act on the built agent.
		expect(agentsBuilderToolsService.getTools.mock.calls[0]?.[0]).toBe('agent-1');
	});

	it.each([
		{ name: 'the built agent without a parent execution', parent: undefined, owner: 'agent-1' },
		{
			name: 'the parent agent with a parent execution',
			parent: parentExecution,
			owner: 'instance-assistant',
		},
	])('reads the checkpoint of a resume from $name', async ({ parent, owner }) => {
		const { service, user, credentialProvider, credentialService, n8nCheckpointStorage } = setup();
		n8nCheckpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint: {} as never });

		await drain(
			service.resumeBuild(
				'agent-1',
				'project-1',
				'builder-run-1',
				'tool-call-1',
				{},
				credentialProvider,
				credentialService,
				user,
				parent ? { ...baseSession, parentExecution: parent } : baseSession,
			),
		);

		expect(n8nCheckpointStorage.getStatus).toHaveBeenCalledWith('builder-run-1', owner);
		expect(n8nCheckpointStorage.getStorage).toHaveBeenCalledWith(owner);
	});

	it('finds and cancels open checkpoints under the state owner', async () => {
		const { service, n8nCheckpointStorage } = setup();
		n8nCheckpointStorage.findSuspendedForThread.mockResolvedValue(null);

		await service.findOpenCheckpointForThread('agent-1', 'builder-thread-1');
		await service.findOpenCheckpointForThread('agent-1', 'builder-thread-1', parentExecution);
		await service.cancelCheckpoint('agent-1', 'run-1');
		await service.cancelCheckpoint('agent-1', 'run-2', parentExecution);

		expect(n8nCheckpointStorage.findSuspendedForThread.mock.calls).toEqual([
			['agent-1', 'builder-thread-1'],
			['instance-assistant', 'builder-thread-1'],
		]);
		expect(n8nCheckpointStorage.delete.mock.calls).toEqual([
			['run-1', 'agent-1'],
			['run-2', 'instance-assistant'],
		]);
	});

	it('keeps the built agent id in the memory usage dedupe key with a parent execution', async () => {
		const { service, user, credentialProvider, credentialService, instanceAiCreditService } =
			setup();

		await drain(
			service.buildAgent(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{ ...baseSession, parentExecution },
			),
		);

		const { observe } = agentsSdkMocks.observationalMemoryCalls[0];
		await observe.options.onUsage({
			task: 'observer',
			model: baseSession.modelConfig,
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		});

		expect(instanceAiCreditService.claimRunUsage).toHaveBeenCalledWith(
			user,
			'instance-thread-1',
			'run-1:agent-builder:agent-1:memory:observer:report-1',
			expect.any(Array),
			'completed',
		);
	});
});
