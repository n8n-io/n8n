const { createInstanceAgent } = vi.hoisted(() => ({ createInstanceAgent: vi.fn() }));

import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import type { MemoryTaskUsageReport } from '@n8n/agents';
import type { ModelConfig } from '@n8n/instance-ai';
import type { Mock } from 'vitest';

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

import { AssistantAgentFactory } from '../assistant-agent.factory';

describe('AssistantAgentFactory — createAgentMemoryOptions', () => {
	type MemoryOptionsInternals = {
		createAgentMemoryOptions: (
			user: User,
			threadId: string,
			runId: string,
			memoryModelId?: ModelConfig,
			observerThresholdTokens?: number,
		) => {
			observationalMemory: {
				observerThresholdTokens: number;
				model?: ModelConfig;
				onTaskUsage: (report: MemoryTaskUsageReport) => Promise<void>;
			};
		};
		instanceAiConfig: Pick<
			InstanceAiConfig,
			'observerMessageTokens' | 'reflectorObservationTokens'
		>;
		creditService: { claimRunUsage: Mock };
		logger: { warn: Mock };
	};

	function buildService(): MemoryOptionsInternals {
		const service = Object.create(
			AssistantAgentFactory.prototype,
		) as unknown as MemoryOptionsInternals;
		service.instanceAiConfig = { observerMessageTokens: 8_000, reflectorObservationTokens: 12_000 };
		service.creditService = { claimRunUsage: vi.fn(async () => {}) };
		service.logger = { warn: vi.fn() };
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

	it('claims converted usage under the orchestrator dedupe key, and skips claiming when usage is zero', async () => {
		const service = buildService();
		const user = { id: 'user-1' } as User;
		const { onTaskUsage } = service.createAgentMemoryOptions(
			user,
			'thread-1',
			'run-1',
		).observationalMemory;

		await onTaskUsage({
			task: 'observer',
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		});

		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			user,
			'thread-1',
			'run-1:memory:observer:report-1',
			[
				{
					type: 'llmTokens',
					model: 'anthropic/claude-sonnet-4-5',
					uncachedInput: 0,
					cacheRead: 0,
					cacheWrite: 0,
					output: 20,
				},
			],
			'completed',
		);

		await onTaskUsage({
			task: 'reflector',
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
			reportId: 'report-2',
		});

		expect(service.creditService.claimRunUsage).toHaveBeenCalledTimes(1);
	});
});

describe('AssistantAgentFactory — model transport', () => {
	it('passes the configured model transport to the orchestrator agent', async () => {
		const modelFetch = vi.fn();
		createInstanceAgent.mockResolvedValue({ agent: {}, mcpConnectionFailures: [] });
		const factory = Object.assign(Object.create(AssistantAgentFactory.prototype) as object, {
			bindAgentContextReader: vi.fn(),
			bindAgentPreviewSession: vi.fn(),
			buildMcpServers: vi.fn(async () => []),
			createAgentMemoryOptions: vi.fn(() => ({})),
			subscribeToAgentErrors: vi.fn(),
			instanceAiConfig: { thinkingEnabled: true },
			_mcpClientManager: {},
			modelService: { getModelFetch: vi.fn(() => modelFetch) },
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

		expect(createInstanceAgent).toHaveBeenCalledWith(expect.objectContaining({ modelFetch }));
	});
});
