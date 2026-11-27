const { createInstanceAgent } = vi.hoisted(() => ({ createInstanceAgent: vi.fn() }));

import type { MemoryTaskUsageReport } from '@n8n/agents';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceAiContext, ModelConfig, OrchestrationContext } from '@n8n/instance-ai';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AgentArchiveService } from '@/modules/agents/agent-archive.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { isAgentsAccessEnabled } from '../../agents-access';
import { InstanceAiAgentContextAdapterService } from '../../instance-ai-agent-context.adapter';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('../../agents-access', () => ({ isAgentsAccessEnabled: vi.fn() }));

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createInstanceAgent,
	tokenUsageToBuilderUsageItems: (
		model: string,
		usage: {
			completionTokens?: number;
			inputTokenDetails?: { noCache?: number; cacheRead?: number; cacheWrite?: number };
		},
	) => {
		const uncachedInput = usage.inputTokenDetails?.noCache ?? 0;
		const cacheRead = usage.inputTokenDetails?.cacheRead ?? 0;
		const cacheWrite = usage.inputTokenDetails?.cacheWrite ?? 0;
		const output = usage.completionTokens ?? 0;
		if (uncachedInput + cacheRead + cacheWrite + output === 0) return [];
		return [{ type: 'llmTokens', model, uncachedInput, cacheRead, cacheWrite, output }];
	},
}));

import { AssistantAgentFactory, type AssistantAgentRuntime } from '../assistant-agent.factory';
import type { AssistantTurnEnvironment } from '../assistant-turn-environment.factory';

describe('AssistantAgentFactory — Agent archive', () => {
	const user = mock<User>({ id: 'user-1' });
	const reader = { lookup: vi.fn() };
	const archiver = mock<AgentArchiveService>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isAgentsAccessEnabled).mockReturnValue(true);
		vi.mocked(userHasScopes).mockResolvedValue(true);
		Container.set(AgentArchiveService, archiver);
		Container.set(
			InstanceAiAgentContextAdapterService,
			mock<InstanceAiAgentContextAdapterService>({ createReader: () => reader }),
		);
		createInstanceAgent.mockResolvedValue({ agent: { on: vi.fn() }, mcpConnectionFailures: [] });
	});

	afterEach(() => {
		Container.reset();
	});

	async function createAgent(overrides: Partial<InstanceAiContext> = {}) {
		const factory = new AssistantAgentFactory(
			mock({ instanceAi: mock<InstanceAiConfig>({ mcpServers: '' }) }),
			mock({ enabled: false }),
			mock(),
			mock<InstanceAiSettingsService>({ isMcpAccessEnabled: () => false }),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);
		const context = mock<InstanceAiContext>({
			projectId: 'project-1',
			branchReadOnly: false,
			agentArchiveService: undefined,
			agentPreviewSession: undefined,
			threadMemory: undefined,
			...overrides,
		});
		const environment = mock<AssistantTurnEnvironment>({
			context,
			orchestrationContext: mock<OrchestrationContext>(),
		});
		const runtime = mock<AssistantAgentRuntime>({
			turnState: { getObserverThresholdTokens: vi.fn() },
		});
		await factory.createAgent(environment, runtime, { user, threadId: 'thread-1', runId: 'run-1' });
		return context;
	}

	it('binds both archive operations to the user and thread project', async () => {
		const context = await createAgent();
		expect(context.agentContextService).toBe(reader);
		expect(context.agentArchiveService).toBeDefined();
		await context.agentArchiveService?.preview('agent-1');
		await context.agentArchiveService?.archive('agent-1');
		expect(archiver.preview).toHaveBeenCalledExactlyOnceWith(user.id, 'project-1', 'agent-1');
		expect(archiver.archive).toHaveBeenCalledExactlyOnceWith(user.id, 'project-1', 'agent-1');
	});

	it('keeps read-only context when the user lacks agent:delete', async () => {
		vi.mocked(userHasScopes).mockImplementation(
			async (_user, scopes) => !scopes.includes('agent:delete'),
		);
		const context = await createAgent();
		expect(context.agentContextService).toBe(reader);
		expect(context.agentArchiveService).toBeUndefined();
	});

	it('keeps read-only context on a read-only branch', async () => {
		const context = await createAgent({ branchReadOnly: true });
		expect(context.agentContextService).toBe(reader);
		expect(context.agentArchiveService).toBeUndefined();
	});

	it('does not bind archive when the Agents feature is disabled', async () => {
		vi.mocked(isAgentsAccessEnabled).mockReturnValue(false);
		expect((await createAgent()).agentArchiveService).toBeUndefined();
	});

	it('does not bind archive without a thread project', async () => {
		expect((await createAgent({ projectId: undefined })).agentArchiveService).toBeUndefined();
		expect(userHasScopes).not.toHaveBeenCalled();
	});
});

describe('AssistantAgentFactory — createAgentMemoryOptions', () => {
	type MemoryOptionsInternals = {
		createAgentMemoryOptions: (
			user: User,
			threadId: string,
			runId: string,
			utilityModelId?: ModelConfig,
			observerThresholdTokens?: number,
			generateTitle?: boolean,
		) => {
			observationalMemory: {
				observerThresholdTokens: number;
				reflectorThresholdTokens?: number;
				model?: ModelConfig;
				onTaskUsage: (report: MemoryTaskUsageReport) => Promise<void>;
				policy?: Record<string, unknown>;
			};
			titleGeneration?: { model?: ModelConfig };
		};
		instanceAiConfig: Pick<
			InstanceAiConfig,
			'observerMessageTokens' | 'reflectorObservationTokens'
		> &
			Partial<InstanceAiConfig>;
		creditService: { claimSideCallUsage: Mock };
	};

	function buildService(): MemoryOptionsInternals {
		const service = Object.create(
			AssistantAgentFactory.prototype,
		) as unknown as MemoryOptionsInternals;
		service.instanceAiConfig = { observerMessageTokens: 8_000, reflectorObservationTokens: 12_000 };
		service.creditService = { claimSideCallUsage: vi.fn(async () => {}) };
		return service;
	}

	it('uses the instance observer threshold when the thread has no override', () => {
		const service = buildService();
		const { observerThresholdTokens } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
		).observationalMemory;
		expect(observerThresholdTokens).toBe(8_000);
	});

	it('passes a set reflector threshold to the SDK', () => {
		const service = buildService();
		const { observationalMemory } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
		);
		expect(observationalMemory.reflectorThresholdTokens).toBe(12_000);
	});

	it('leaves the reflector threshold unset so the SDK uses the reflect share', () => {
		const service = buildService();
		service.instanceAiConfig = { observerMessageTokens: 8_000 };
		const { observationalMemory } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
		);
		expect(observationalMemory).not.toHaveProperty('reflectorThresholdTokens');
	});

	it('passes the memory model to the memory tasks, and leaves it unset by default', () => {
		const service = buildService();
		const user = { id: 'user-1' } as User;
		expect(
			service.createAgentMemoryOptions(user, 'thread-1', 'run-1', 'anthropic/claude-haiku-4-5')
				.observationalMemory.model,
		).toBe('anthropic/claude-haiku-4-5');
		// The proxy and credential paths return object configs, which must pass through as-is.
		const credentialModel: ModelConfig = {
			kind: 'endpoint',
			id: 'anthropic/claude-haiku-4-5',
			url: '',
			apiKey: 'main-key',
		};
		expect(
			service.createAgentMemoryOptions(user, 'thread-1', 'run-1', credentialModel)
				.observationalMemory.model,
		).toBe(credentialModel);
		expect(
			service.createAgentMemoryOptions(user, 'thread-1', 'run-1').observationalMemory.model,
		).toBeUndefined();
	});

	it('generates titles only when the caller asks for it, on the memory model, without waiting for them', () => {
		const service = buildService();
		const user = { id: 'user-1' } as User;
		expect(
			service.createAgentMemoryOptions(user, 'thread-1', 'run-1').titleGeneration,
		).toBeUndefined();
		expect(
			service.createAgentMemoryOptions(user, 'thread-1', 'run-1', undefined, undefined, true)
				.titleGeneration,
		).toEqual({});
		expect(
			service.createAgentMemoryOptions(
				user,
				'thread-1',
				'run-1',
				'anthropic/claude-haiku-4-5',
				undefined,
				true,
			).titleGeneration,
		).toEqual({ model: 'anthropic/claude-haiku-4-5' });
	});

	it('uses the per-thread override when an eval set one', () => {
		const service = buildService();
		const { observerThresholdTokens } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
			undefined,
			1_000,
		).observationalMemory;
		expect(observerThresholdTokens).toBe(1_000);
	});

	it('passes the configured memory policy to the observational memory options', () => {
		const service = buildService();
		Object.assign(service.instanceAiConfig, {
			observationMaxWindowTokens: 0,
			observationLogPlacement: 'message',
			observationFailurePolicy: 'retry',
			observerMaxBatches: 5,
			reflectionMode: 'afterObserve',
			historyRecall: true,
		});
		const { policy } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
		).observationalMemory;
		expect(policy).toEqual({
			windowShares: {},
			logPlacement: 'message',
			failurePolicy: 'retry',
			maxObserverBatchesAfterTurn: 5,
			reflectionMode: 'afterObserve',
			historyRecall: true,
		});
	});

	it('passes the window cap with the window shares, and omits it when set to 0', () => {
		const service = buildService();
		Object.assign(service.instanceAiConfig, {
			observationMaxWindowTokens: 200_000,
		});
		const create = () =>
			service.createAgentMemoryOptions({ id: 'user-1' } as User, 'thread-1', 'run-1')
				.observationalMemory.policy;
		expect(create()?.windowShares).toEqual({ maxContextWindowTokens: 200_000 });

		service.instanceAiConfig.observationMaxWindowTokens = 0;
		expect(create()?.windowShares).toEqual({});
	});

	it('keeps the eval threshold override over window shares', () => {
		const service = buildService();
		Object.assign(service.instanceAiConfig, {
			observerMaxBatches: 0,
		});
		const { policy, observerThresholdTokens } = service.createAgentMemoryOptions(
			{ id: 'user-1' } as User,
			'thread-1',
			'run-1',
			undefined,
			1_000,
		).observationalMemory;
		expect(observerThresholdTokens).toBe(1_000);
		expect(policy?.windowShares).toBeUndefined();
		expect(policy?.maxObserverBatchesAfterTurn).toBe(0);
	});

	it('claims each memory task call under the orchestrator dedupe key', async () => {
		const service = buildService();
		const user = { id: 'user-1' } as User;
		const { onTaskUsage } = service.createAgentMemoryOptions(
			user,
			'thread-1',
			'run-1',
		).observationalMemory;
		const report = {
			task: 'observer' as const,
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		};

		await onTaskUsage(report);

		expect(service.creditService.claimSideCallUsage).toHaveBeenCalledWith(
			user,
			'thread-1',
			'run-1:memory:observer:report-1',
			report,
		);
	});
});

describe('AssistantAgentFactory — model transport', () => {
	it.each([true, false])('passes requestLabels %s from the config', async (modelRequestLabels) => {
		createInstanceAgent.mockClear();
		createInstanceAgent.mockResolvedValue({ agent: {}, mcpConnectionFailures: [] });
		const factory = Object.assign(Object.create(AssistantAgentFactory.prototype) as object, {
			bindAgentContextReader: vi.fn(),
			bindAgentPreviewSession: vi.fn(),
			buildMcpServers: vi.fn(async () => []),
			createAgentMemoryOptions: vi.fn(() => ({})),
			subscribeToAgentErrors: vi.fn(),
			instanceAiConfig: { thinkingEnabled: true, modelRequestLabels },
			_mcpClientManager: {},
			modelService: { getLabeledModelFetch: vi.fn() },
		}) as unknown as AssistantAgentFactory;

		await factory.createAgent(
			{
				modelId: 'anthropic/claude-sonnet-4-6',
				context: {},
				orchestrationContext: {},
			} as unknown as Parameters<AssistantAgentFactory['createAgent']>[0],
			{
				turnState: { getObserverThresholdTokens: vi.fn() },
			} as unknown as Parameters<AssistantAgentFactory['createAgent']>[1],
			{ user: { id: 'user-1' } as User, threadId: 'thread-1', runId: 'run-1' },
		);

		expect(createInstanceAgent).toHaveBeenCalledWith(
			expect.objectContaining({ requestLabels: modelRequestLabels }),
		);
	});

	it('passes the labeled model transport to the orchestrator agent', async () => {
		const modelFetch = vi.fn();
		createInstanceAgent.mockResolvedValue({ agent: {}, mcpConnectionFailures: [] });
		const factory = Object.assign(Object.create(AssistantAgentFactory.prototype) as object, {
			bindAgentContextReader: vi.fn(),
			bindAgentPreviewSession: vi.fn(),
			buildMcpServers: vi.fn(async () => []),
			createAgentMemoryOptions: vi.fn(() => ({})),
			subscribeToAgentErrors: vi.fn(),
			instanceAiConfig: { thinkingEnabled: true, modelRequestLabels: true },
			_mcpClientManager: {},
			modelService: { getLabeledModelFetch: vi.fn(() => modelFetch) },
		}) as unknown as AssistantAgentFactory;

		await factory.createAgent(
			{
				modelId: 'anthropic/claude-sonnet-4-6',
				context: {},
				orchestrationContext: {},
			} as unknown as Parameters<AssistantAgentFactory['createAgent']>[0],
			{
				turnState: { getObserverThresholdTokens: vi.fn() },
			} as unknown as Parameters<AssistantAgentFactory['createAgent']>[1],
			{ user: { id: 'user-1' } as User, threadId: 'thread-1', runId: 'run-1' },
		);

		expect(createInstanceAgent).toHaveBeenCalledWith(
			expect.objectContaining({ modelFetch, requestLabels: true }),
		);
		expect(
			(factory as unknown as { modelService: { getLabeledModelFetch: unknown } }).modelService
				.getLabeledModelFetch,
		).toHaveBeenCalledWith({ runId: 'run-1', threadId: 'thread-1' });
	});
});

describe('AssistantAgentFactory — agent error reports', () => {
	it('reports a background agent error with the ids and the trace of the turn', async () => {
		let onError: ((event: unknown) => void) | undefined;
		const agent = {
			on: vi.fn((_event: string, handler: (event: unknown) => void) => {
				onError = handler;
			}),
		};
		createInstanceAgent.mockResolvedValue({ agent, mcpConnectionFailures: [] });
		const report = vi.fn();
		const factory = Object.assign(Object.create(AssistantAgentFactory.prototype) as object, {
			bindAgentContextReader: vi.fn(),
			bindAgentPreviewSession: vi.fn(),
			buildMcpServers: vi.fn(async () => []),
			createAgentMemoryOptions: vi.fn(() => ({})),
			instanceAiConfig: { thinkingEnabled: true },
			_mcpClientManager: {},
			modelService: { getLabeledModelFetch: vi.fn() },
			instanceAiErrorReporter: { report },
		}) as unknown as AssistantAgentFactory;
		const tracing = { rootRun: { traceId: 'ls-trace-1' } };

		await factory.createAgent(
			{
				modelId: 'anthropic/claude-sonnet-4-6',
				context: {},
				orchestrationContext: {
					threadId: 'thread-1',
					runId: 'run-1',
					userId: 'user-1',
					messageGroupId: 'mg-1',
				},
			} as unknown as Parameters<AssistantAgentFactory['createAgent']>[0],
			{
				turnState: { getObserverThresholdTokens: vi.fn() },
			} as unknown as Parameters<AssistantAgentFactory['createAgent']>[1],
			{
				user: { id: 'user-1' } as User,
				threadId: 'thread-1',
				runId: 'run-1',
				tracing: tracing as unknown as NonNullable<
					Parameters<AssistantAgentFactory['createAgent']>[2]['tracing']
				>,
			},
		);
		const error = new Error('persist failed');
		onError?.({ type: 'error', source: 'input-persistence', error });

		expect(report).toHaveBeenCalledWith(error, {
			component: 'instance-ai-input-persistence',
			threadId: 'thread-1',
			runId: 'run-1',
			userId: 'user-1',
			messageGroupId: 'mg-1',
			tracing,
		});
	});
});
