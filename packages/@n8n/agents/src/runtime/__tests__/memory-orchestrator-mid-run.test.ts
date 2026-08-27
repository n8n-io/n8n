import type { ObservationalMemoryConfig } from '../../types';
import type { ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList, OBSERVATION_CONTINUATION_REMINDER } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';

function userMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

function assistantMsg(text: string): AgentMessage {
	return { role: 'assistant', content: [{ type: 'text', text }] };
}

function runOptions(): RunOptions & ExecutionOptions {
	return { persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID } };
}

function buildOrchestrator(
	store: InMemoryMemory,
	observationalMemory: ObservationalMemoryConfig,
): MemoryOrchestrator {
	const config = {
		name: 'mid-run-agent',
		memory: store,
		observationalMemory,
	} as unknown as AgentRuntimeConfig;
	// Character-count token counter keeps budget thresholds deterministic.
	return new MemoryOrchestrator(
		config,
		new BackgroundTaskTracker(),
		new AgentEventBus(),
		new RuntimeTelemetry(config),
		async (text) => await Promise.resolve(text.length),
	);
}

describe('MemoryOrchestrator.maybeObserveMidRun', () => {
	it('does nothing below the token budget', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const orchestrator = buildOrchestrator(store, {
			midRunObservation: true,
			observerThresholdTokens: 100_000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('hello')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('persists the turn, writes observations, advances the cursor, and masks the window on crossing', async () => {
		const store = new InMemoryMemory();
		const orchestrator = buildOrchestrator(store, {
			midRunObservation: true,
			observerThresholdTokens: 10,
			observe: async () =>
				await Promise.resolve('* CRITICAL (14:30) User set up mid-run observation.'),
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		const persisted = await store.getMessagesForObservationScope(THREAD_ID);
		expect(persisted.map((m) => m.id)).toEqual(list.messages().map((m) => m.id));

		const observations = await store.getActiveObservationLog({ observationScopeId: THREAD_ID });
		expect(observations).toMatchObject([
			{ marker: 'critical', text: 'User set up mid-run observation.' },
		]);

		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);

		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);
		expect(list.observationLogMemory).toContain('User set up mid-run observation.');
	});

	it('is a no-op when the flag is off, even far above the threshold', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const orchestrator = buildOrchestrator(store, {
			observerThresholdTokens: 1,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a very long message far beyond the tiny threshold')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('leaves the window unmasked when the observer fails', async () => {
		const store = new InMemoryMemory();
		const orchestrator = buildOrchestrator(store, {
			midRunObservation: true,
			observerThresholdTokens: 10,
			observe: async () => await Promise.reject(new Error('observer exploded')),
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);

		await expect(orchestrator.maybeObserveMidRun(list, runOptions())).resolves.toBeUndefined();

		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('skips without masking when another holder owns the observer lock', async () => {
		const store = new InMemoryMemory();
		await store.acquireObservationLogTaskLock(THREAD_ID, 'observer', {
			holderId: 'someone-else',
			ttlMs: 60_000,
		});
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const orchestrator = buildOrchestrator(store, {
			midRunObservation: true,
			observerThresholdTokens: 10,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('resets the budget after compaction and observes again when new messages cross it', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* IMPORTANT (14:31) Progress recorded.'),
		);
		const orchestrator = buildOrchestrator(store, {
			midRunObservation: true,
			observerThresholdTokens: 30,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('first chunk of work with enough characters to cross')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);

		// Everything visible was just compacted — budget is back to zero.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);

		list.addResponse([assistantMsg('second chunk of work with enough characters to cross')]);
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(2);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(2);
	});
});
