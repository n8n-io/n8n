import type { AgentDbMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';

function message(id: string, text: string, createdAt: Date): AgentDbMessage {
	return { id, createdAt, role: 'user', content: [{ type: 'text', text }] };
}

async function seedThread(store: InMemoryMemory, messages: AgentDbMessage[]): Promise<void> {
	await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
	await store.saveMessages({ threadId: THREAD_ID, resourceId: RESOURCE_ID, messages });
}

function buildOrchestrator(store: InMemoryMemory): MemoryOrchestrator {
	// loadHistoryMessages only reads config.memory + config.observationalMemory;
	// the tracker/event-bus are unused on this path.
	const config = {
		memory: store,
		observationalMemory: {},
	} as unknown as AgentRuntimeConfig;
	return new MemoryOrchestrator(config, new BackgroundTaskTracker(), new AgentEventBus());
}

describe('MemoryOrchestrator.loadHistoryMessages with observational memory', () => {
	const m1 = message('m1', 'first', new Date(2026, 4, 12, 14, 30));
	const m2 = message('m2', 'second', new Date(2026, 4, 12, 14, 31));
	const m3 = message('m3', 'third', new Date(2026, 4, 12, 14, 32));

	it('falls back to full history when the cursor advanced but no observations exist', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [m1, m2, m3]);
		// Cursor advanced to the latest message, but the observation log is empty —
		// the desync that caused mid-thread amnesia.
		await store.setCursor({
			observationScopeId: THREAD_ID,
			lastObservedMessageId: m3.id,
			lastObservedAt: m3.createdAt,
			updatedAt: m3.createdAt,
		});

		const loaded = await buildOrchestrator(store).loadHistoryMessages({
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
		});

		// Without the fallback this returns [] (only messages after the cursor),
		// which is exactly the amnesia bug. The whole conversation must survive.
		expect(loaded.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
	});

	it('honors the cursor (loads only post-cursor messages) when an observation log exists', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [m1, m2, m3]);
		await store.setCursor({
			observationScopeId: THREAD_ID,
			lastObservedMessageId: m1.id,
			lastObservedAt: m1.createdAt,
			updatedAt: m1.createdAt,
		});
		await store.appendObservationLogEntries([
			{
				observationScopeId: THREAD_ID,
				marker: 'critical',
				text: 'User context captured.',
				parentId: null,
				createdAt: m1.createdAt,
			},
		]);

		const loaded = await buildOrchestrator(store).loadHistoryMessages({
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
		});

		expect(loaded.map((m) => m.id)).toEqual(['m2', 'm3']);
	});

	it('loads full history when no cursor exists yet', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [m1, m2, m3]);

		const loaded = await buildOrchestrator(store).loadHistoryMessages({
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
		});

		expect(loaded.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
	});
});
