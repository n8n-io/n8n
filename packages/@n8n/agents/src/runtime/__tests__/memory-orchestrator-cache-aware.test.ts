import type { ObservationalMemoryConfig } from '../../types';
import type { AgentDbMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { createReadHistoryTool } from '../memory/history-recall-tool';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

// Keep the tests off the network: the window is unknown unless a test sets it.
const contextWindow = vi.hoisted(() => ({ value: undefined as number | undefined }));
vi.mock('../../sdk/catalog', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getModelContextWindow: async () => await Promise.resolve(contextWindow.value),
}));

beforeEach(() => {
	contextWindow.value = undefined;
});

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
const persistence = { threadId: THREAD_ID, resourceId: RESOURCE_ID };

function message(id: string, text: string, createdAt: Date): AgentDbMessage {
	return { id, createdAt, role: 'user', content: [{ type: 'text', text }] };
}

/** Thread with m1 and m2 observed, m3 not, and the last activity `ageMs` ago. */
async function seedObservedThread(ageMs: number): Promise<InMemoryMemory> {
	const store = new InMemoryMemory();
	const last = Date.now() - ageMs;
	const m1 = message('m1', 'first', new Date(last - 3_000));
	const m2 = message('m2', 'second', new Date(last - 2_000));
	const m3 = message('m3', 'third', new Date(last));
	await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
	await store.saveMessages({
		threadId: THREAD_ID,
		resourceId: RESOURCE_ID,
		messages: [m1, m2, m3],
	});
	await store.appendObservationLogEntries([
		{
			observationScopeId: THREAD_ID,
			marker: 'critical',
			text: 'User wants the invoice report.',
			createdAt: m2.createdAt,
		},
	]);
	await store.setCursor({
		observationScopeId: THREAD_ID,
		lastObservedMessageId: m2.id,
		lastObservedAt: m2.createdAt,
		updatedAt: m2.createdAt,
	});
	return store;
}

function buildOrchestrator(
	store: InMemoryMemory,
	observationalMemory: ObservationalMemoryConfig,
): MemoryOrchestrator {
	const config = {
		name: 'test',
		model: 'anthropic/claude-sonnet-4-5',
		memory: store,
		observationalMemory: { observerThresholdTokens: 1_000, ...observationalMemory },
	} as unknown as AgentRuntimeConfig;
	return new MemoryOrchestrator(
		config,
		new BackgroundTaskTracker(),
		new AgentEventBus(),
		new RuntimeTelemetry(config),
		() => 1,
	);
}

async function load(store: InMemoryMemory, config: ObservationalMemoryConfig) {
	const list = new AgentMessageList();
	await buildOrchestrator(store, config).loadInto(list, { persistence });
	return list;
}

describe('cacheAware history', () => {
	it('replays only unobserved messages and the log in masked mode', async () => {
		const list = await load(await seedObservedThread(60_000), {});
		expect(list.llmVisibleMessages().map((m) => m.id)).toEqual(['m3']);
		expect(list.observationLogMemory).toContain('invoice report');
	});

	it('replays the full history without the log while the cache is warm', async () => {
		const list = await load(await seedObservedThread(60_000), { historyMode: 'cacheAware' });
		expect(list.llmVisibleMessages().map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
		expect(list.observationLogMemory).toBeUndefined();
	});

	it('swaps to the log after the cache expires', async () => {
		const list = await load(await seedObservedThread(2 * 60 * 60_000), {
			historyMode: 'cacheAware',
		});
		expect(list.llmVisibleMessages().map((m) => m.id)).toEqual(['m3']);
		expect(list.observationLogMemory).toContain('invoice report');
	});

	it('uses the provider cache retention when cacheTtlMs is unset', async () => {
		// Anthropic keeps the cache for 1 hour by default, so 10 minutes is still warm.
		const warm = await load(await seedObservedThread(10 * 60_000), { historyMode: 'cacheAware' });
		expect(warm.llmVisibleMessages().map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
		const cold = await load(await seedObservedThread(10 * 60_000), {
			historyMode: 'cacheAware',
			cacheTtlMs: 5 * 60_000,
		});
		expect(cold.llmVisibleMessages().map((m) => m.id)).toEqual(['m3']);
	});

	it('swaps when the full history is over the hard limit', async () => {
		const list = await load(await seedObservedThread(60_000), {
			historyMode: 'cacheAware',
			// Without a window the limit is twice the observer threshold.
			observerThresholdTokens: 1,
		});
		expect(list.llmVisibleMessages().map((m) => m.id)).toEqual(['m3']);
	});

	it('replays full history past a fixed threshold when the window is known', async () => {
		contextWindow.value = 1_000_000;
		const list = await load(await seedObservedThread(60_000), {
			historyMode: 'cacheAware',
			observerThresholdTokens: 2,
		});
		expect(list.llmVisibleMessages().map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
	});
});

describe('log placement', () => {
	it('keeps the log out of the system prompt in message placement', async () => {
		const list = await load(await seedObservedThread(60_000), { logPlacement: 'message' });
		const { system, messages } = list.forLlm('base');
		expect(JSON.stringify(system)).not.toContain('invoice report');
		expect(JSON.stringify(messages[0])).toContain('invoice report');
	});

	it('puts the log in the system prompt by default', async () => {
		const list = await load(await seedObservedThread(60_000), {});
		const { system } = list.forLlm('base');
		expect(JSON.stringify(system)).toContain('invoice report');
	});
});

describe('read_history tool', () => {
	it('finds observed messages by text', async () => {
		const store = await seedObservedThread(60_000);
		const tool = createReadHistoryTool({ memory: store, persistence });
		const result = (await tool.handler!({ query: 'SECOND' }, {} as never)) as {
			messages: Array<{ id: string }>;
		};
		expect(result.messages.map((m) => m.id)).toEqual(['m2']);
	});
});
