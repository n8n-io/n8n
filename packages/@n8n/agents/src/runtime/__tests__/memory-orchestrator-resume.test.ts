import type { ObservationalMemoryConfig } from '../../types';
import type { AgentDbMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { createReadHistoryTool } from '../memory/history-recall-tool';
import { loadReplayedMessages, MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

// Keep the tests off the network: the window comes from `contextWindowTokens`.
vi.mock('../../sdk/catalog', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getModelContextWindow: async () => await Promise.resolve(undefined),
}));

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
const MODEL = 'anthropic/claude-sonnet-4-5';
const persistence = { threadId: THREAD_ID, resourceId: RESOURCE_ID };
// Past the provider's cache lifetime (Anthropic keeps it for 1 hour).
const COLD = 2 * 60 * 60_000;

// Each message counts as 1 token. A 10-token window makes a 2-token request worth resuming.
const baseConfig: ObservationalMemoryConfig = {
	windowShares: { contextWindowTokens: 10 },
	logPlacement: 'message',
};

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
	await addNote(store, 'User wants the invoice report.', m2.createdAt);
	await store.setCursor({
		observationScopeId: THREAD_ID,
		lastObservedMessageId: m2.id,
		lastObservedAt: m2.createdAt,
		updatedAt: m2.createdAt,
	});
	return store;
}

async function addNote(store: InMemoryMemory, text: string, createdAt: Date) {
	await store.appendObservationLogEntries([
		{ observationScopeId: THREAD_ID, marker: 'critical', text, createdAt },
	]);
}

function buildOrchestrator(
	store: InMemoryMemory,
	overrides: Partial<ObservationalMemoryConfig> = {},
): MemoryOrchestrator {
	const config = {
		name: 'test',
		model: MODEL,
		memory: store,
		observationalMemory: { ...baseConfig, ...overrides },
	} as unknown as AgentRuntimeConfig;
	return new MemoryOrchestrator(
		config,
		new BackgroundTaskTracker(),
		new AgentEventBus(),
		new RuntimeTelemetry(config),
		() => 1,
	);
}

async function load(store: InMemoryMemory, overrides: Partial<ObservationalMemoryConfig> = {}) {
	const list = new AgentMessageList();
	await buildOrchestrator(store, overrides).loadInto(list, { persistence });
	return list;
}

const visibleIds = (list: AgentMessageList) => list.llmVisibleMessages().map((m) => m.id);

describe('history at turn start', () => {
	it('replays the full thread without notes while there is no resume point and the cache is warm', async () => {
		const list = await load(await seedObservedThread(60_000));
		expect(visibleIds(list)).toEqual(['m1', 'm2', 'm3']);
		expect(list.observationLogMemory).toBeUndefined();
	});

	it('resumes from the cursor when the cache is cold and saves the resume point', async () => {
		const store = await seedObservedThread(COLD);
		const list = await load(store);
		expect(visibleIds(list)).toEqual(['m3']);
		expect(list.observationLogMemory).toContain('invoice report');
		const state = await store.getResumeState(THREAD_ID);
		expect(state?.resumeFrom?.lastObservedMessageId).toBe('m2');
		expect(state?.resumeNotes).toContain('invoice report');
		expect(state?.lastModelId).toBe(MODEL);
	});

	it('resumes when the saved request size is over the window, even with a warm cache', async () => {
		const store = await seedObservedThread(60_000);
		await store.saveResumeState({
			observationScopeId: THREAD_ID,
			resumeFrom: null,
			resumeNotes: null,
			lastRequestTokens: 18,
			lastModelId: MODEL,
		});
		const list = await load(store);
		expect(visibleIds(list)).toEqual(['m3']);
	});

	it('resumes when the thread moved to another model', async () => {
		const store = await seedObservedThread(60_000);
		await store.saveResumeState({
			observationScopeId: THREAD_ID,
			resumeFrom: null,
			resumeNotes: null,
			lastRequestTokens: 3,
			lastModelId: 'openai/gpt-5',
		});
		expect(visibleIds(await load(store))).toEqual(['m3']);
	});

	it('keeps the full thread on a cold cache when the replaced part is small', async () => {
		const store = await seedObservedThread(COLD);
		// A 200-token window resumes from 40 tokens; this request is far smaller.
		const list = await load(store, { windowShares: { contextWindowTokens: 200 } });
		expect(visibleIds(list)).toEqual(['m1', 'm2', 'm3']);
	});

	it('sends the frozen notes from the resume point on later turns', async () => {
		const store = await seedObservedThread(COLD);
		await load(store);
		// The Observer writes again and the cursor moves past m3.
		const m3 = (await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID }))[2];
		await addNote(store, 'User picked PDF.', m3.createdAt);
		await store.setCursor({
			observationScopeId: THREAD_ID,
			lastObservedMessageId: m3.id,
			lastObservedAt: m3.createdAt,
			updatedAt: m3.createdAt,
		});
		const resumed = await store.getResumeState(THREAD_ID);
		await store.saveResumeState({ ...resumed!, lastRequestTokens: 3 });
		// On a 20-token window this 3-token request is too small to resume again.
		const list = await load(store, { windowShares: { contextWindowTokens: 20 } });
		expect(visibleIds(list)).toEqual(['m3']);
		expect(list.observationLogMemory).toBe(resumed?.resumeNotes);
		expect(list.observationLogMemory).not.toContain('PDF');
	});

	it('replays the same window to hosts that read it', async () => {
		const store = await seedObservedThread(COLD);
		const replayed = async () =>
			(await loadReplayedMessages(store, persistence, { observationalMemory: true })).map(
				(m) => m.id,
			);
		expect(await replayed()).toEqual(['m1', 'm2', 'm3']);
		await load(store);
		expect(await replayed()).toEqual(['m3']);
	});
});

describe('log placement', () => {
	it('keeps the notes out of the system prompt in message placement', async () => {
		const list = await load(await seedObservedThread(COLD));
		const { system, messages } = list.forLlm('base');
		expect(JSON.stringify(system)).not.toContain('invoice report');
		expect(JSON.stringify(messages[0])).toContain('invoice report');
	});

	it('puts the notes in the system prompt with system placement', async () => {
		const list = await load(await seedObservedThread(COLD), {
			logPlacement: 'system',
		});
		expect(JSON.stringify(list.forLlm('base').system)).toContain('invoice report');
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
