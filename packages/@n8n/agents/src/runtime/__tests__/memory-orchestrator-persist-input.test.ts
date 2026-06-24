import type { RunOptions } from '../../types/sdk/agent';
import type { AgentDbMessage, AgentMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
const PERSIST: RunOptions = { persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID } };

function userMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

function buildOrchestrator(store?: InMemoryMemory): MemoryOrchestrator {
	const config = { memory: store } as unknown as AgentRuntimeConfig;
	return new MemoryOrchestrator(config, new BackgroundTaskTracker(), new AgentEventBus());
}

function textsOf(messages: AgentDbMessage[]): string[] {
	return messages.map((m) => {
		const [block] = (m as { content: Array<{ type: string; text: string }> }).content;
		return block.text;
	});
}

describe('MemoryOrchestrator.persistInputMessages', () => {
	it('persists only the input delta, not history or responses', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addHistory([{ id: 'h1', createdAt: new Date(2024, 0, 1), ...userMsg('old history') }]);
		list.addInput([userMsg('the user prompt')]);
		list.addResponse([userMsg('assistant reply')]);

		await buildOrchestrator(store).persistInputMessages(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['the user prompt']);
	});

	it('is a no-op when no persistence options are provided', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		await buildOrchestrator(store).persistInputMessages(list, undefined);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(persisted).toEqual([]);
	});

	it('is a no-op when there is no memory store configured', async () => {
		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		// Should resolve without throwing even though there is nowhere to persist.
		await expect(
			buildOrchestrator(undefined).persistInputMessages(list, PERSIST),
		).resolves.toBeUndefined();
	});

	it('is a no-op when there are no input messages', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addHistory([{ id: 'h1', createdAt: new Date(2024, 0, 1), ...userMsg('old history') }]);

		await buildOrchestrator(store).persistInputMessages(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(persisted).toEqual([]);
	});

	it('is idempotent with the end-of-turn save — one row per input id', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);
		list.addResponse([userMsg('assistant reply')]);

		const orchestrator = buildOrchestrator(store);
		// Eager save on receipt, then the normal end-of-turn save of the full delta.
		await orchestrator.persistInputMessages(list, PERSIST);
		await orchestrator.saveToMemory(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['the user prompt', 'assistant reply']);
		// The eagerly-saved input must be upserted, not duplicated.
		const inputId = list.inputDelta()[0].id;
		expect(persisted.filter((m) => m.id === inputId)).toHaveLength(1);
	});

	it('does not throw when the underlying save fails (best-effort)', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		vi.spyOn(store, 'saveMessages').mockRejectedValue(new Error('db down'));

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		// A transient persistence failure must not abort the turn.
		await expect(
			buildOrchestrator(store).persistInputMessages(list, PERSIST),
		).resolves.toBeUndefined();
	});
});
