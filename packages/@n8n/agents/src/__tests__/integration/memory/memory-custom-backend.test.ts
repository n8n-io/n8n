/**
 * Integration test: custom BuiltMemory backend.
 *
 * Proves that any object implementing the BuiltMemory interface works with the
 * agent runtime — no SDK-provided storage class needed. This is the contract
 * that Redis, DynamoDB, TypeORM, or any other persistence layer must satisfy.
 */
import { expect, it, beforeEach } from 'vitest';

import { Agent, Memory, toDbMessage, type AgentDbMessage, type AgentMessage } from '../../../index';
import type { BuiltMemory, Thread } from '../../../types/sdk/memory';
import { describeIf, findLastTextContent, getModel } from '../helpers';

const describe = describeIf('anthropic');

// ---------------------------------------------------------------------------
// Custom in-memory BuiltMemory implementation (simulates Redis, DynamoDB, etc.)
// ---------------------------------------------------------------------------
class CustomMapMemory implements BuiltMemory {
	readonly threads = new Map<string, Thread>();
	readonly messages = new Map<string, AgentDbMessage[]>();
	readonly workingMemory = new Map<string, string>();

	// --- Thread management ---

	async getThread(threadId: string): Promise<Thread | null> {
		return this.threads.get(threadId) ?? null;
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		const now = new Date();
		const full: Thread = { ...thread, createdAt: now, updatedAt: now };
		this.threads.set(thread.id, full);
		return full;
	}

	async deleteThread(threadId: string): Promise<void> {
		this.threads.delete(threadId);
		this.messages.delete(threadId);
	}

	// --- Message persistence ---

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]> {
		let msgs = this.messages.get(threadId) ?? [];
		if (opts?.before) {
			msgs = msgs.filter((m) => {
				const ts = 'createdAt' in m ? (m as Record<string, unknown>).createdAt : undefined;
				return ts instanceof Date ? ts < opts.before! : true;
			});
		}
		if (opts?.limit) {
			msgs = msgs.slice(-opts.limit);
		}
		return msgs.map(toDbMessage);
	}

	async saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentMessage[];
	}): Promise<void> {
		const existing = this.messages.get(args.threadId) ?? [];
		this.messages.set(args.threadId, [...existing, ...args.messages.map(toDbMessage)]);
	}

	async deleteMessages(messageIds: string[]): Promise<void> {
		for (const [threadId, msgs] of this.messages) {
			const idSet = new Set(messageIds);
			this.messages.set(
				threadId,
				msgs.filter((m) => !idSet.has(m.id)),
			);
		}
	}

	// --- Working memory (Tier 2) ---

	async getWorkingMemory(params: {
		threadId: string;
		resourceId: string;
		scope: 'resource' | 'thread';
	}): Promise<string | null> {
		return (
			this.workingMemory.get(params.scope === 'resource' ? params.resourceId : params.threadId) ??
			null
		);
	}

	async saveWorkingMemory(
		params: { threadId: string; resourceId: string; scope: 'resource' | 'thread' },
		content: string,
	): Promise<void> {
		const id = params.scope === 'resource' ? params.resourceId : params.threadId;
		this.workingMemory.set(id, content);
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('custom BuiltMemory backend', () => {
	let store: CustomMapMemory;

	beforeEach(() => {
		store = new CustomMapMemory();
	});

	it('recalls previous messages across turns', async () => {
		const memory = new Memory().storage(store).lastMessages(10);

		const agent = new Agent('custom-mem-recall')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `custom-thread-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'user-1' } };

		await agent.generate('My name is Valentina. Just acknowledge.', options);

		const result = await agent.generate('What is my name?', options);
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('valentina');

		// Verify the custom store actually received messages
		const stored = store.messages.get(threadId);
		expect(stored).toBeDefined();
		expect(stored!.length).toBeGreaterThanOrEqual(2);
	});

	it('isolates threads in the custom backend', async () => {
		const memory = new Memory().storage(store).lastMessages(10);

		const agent = new Agent('custom-mem-isolation')
			.model(getModel('anthropic'))
			.instructions(
				'You are a helpful assistant. Be concise. If you don\'t know something, say "I don\'t know".',
			)
			.memory(memory);

		const thread1 = `custom-t1-${Date.now()}`;
		const thread2 = `custom-t2-${Date.now()}`;

		await agent.generate('The secret word is NEPTUNE. Just acknowledge.', {
			persistence: { threadId: thread1, resourceId: 'user-1' },
		});

		const result = await agent.generate('What is the secret word?', {
			persistence: { threadId: thread2, resourceId: 'user-1' },
		});

		expect(findLastTextContent(result.messages)?.toLowerCase()).not.toContain('neptune');

		// Thread 1 should have messages, thread 2 should have its own
		expect(store.messages.get(thread1)!.length).toBeGreaterThan(0);
		expect(store.messages.get(thread2)!.length).toBeGreaterThan(0);
	});

	it('persists and retrieves resource-scoped working memory via custom backend', async () => {
		const memory = new Memory()
			.storage(store)
			.lastMessages(10)
			.scope('resource')
			.freeform('# User Profile\n- **Name**:\n- **Favorite color**:');

		const agent = new Agent('custom-mem-working')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise. Always update your working memory.')
			.memory(memory);

		const threadId = `custom-wm-${Date.now()}`;
		const resourceId = 'user-wm-1';
		const options = { persistence: { threadId, resourceId } };

		await agent.generate('My name is Kenji and my favorite color is teal.', options);

		// Working memory should have been persisted keyed by resourceId
		const wm = store.workingMemory.get(resourceId);
		expect(wm).toBeDefined();
		expect(wm!.toLowerCase()).toContain('kenji');

		// New thread, same resourceId — resource-scoped working memory carries over
		const thread2 = `custom-wm2-${Date.now()}`;
		const result = await agent.generate('What is my name?', {
			persistence: { threadId: thread2, resourceId },
		});
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('kenji');
	});

	it('persists and retrieves thread-scoped working memory via custom backend', async () => {
		const memory = new Memory()
			.storage(store)
			.lastMessages(10)
			.scope('thread')
			.freeform('# Conversation Notes\n- **Topic**:\n- **Key facts**:');

		const agent = new Agent('custom-mem-thread-wm')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise. Always update your working memory.')
			.memory(memory);

		const threadId = `custom-twm-${Date.now()}`;
		const resourceId = 'user-twm-1';

		await agent.generate('The project codename is AURORA. Just acknowledge.', {
			persistence: { threadId, resourceId },
		});

		// Working memory should be stored keyed by threadId
		const wmByThread = store.workingMemory.get(threadId);
		expect(wmByThread).toBeDefined();
		expect(wmByThread!.toLowerCase()).toContain('aurora');

		// Different thread for same resource — should NOT see the previous working memory
		const thread2 = `custom-twm2-${Date.now()}`;
		const result = await agent.generate(
			'What is the project codename? Answer "unknown" if you have no information.',
			{ persistence: { threadId: thread2, resourceId } },
		);
		expect(findLastTextContent(result.messages)?.toLowerCase()).not.toContain('aurora');

		// Thread 2 working memory should be independent
		expect(store.workingMemory.get(thread2)).not.toContain('aurora');
	});

	it('thread-scoped working memory allows recall within the same thread when history is truncated', async () => {
		// Use lastMessages: 1 so earlier turns are pushed out of the history window.
		// The agent must rely on working memory — not chat history — to recall old facts.
		const memory = new Memory()
			.storage(store)
			.lastMessages(1)
			.scope('thread')
			.freeform('# Key facts\n- **Secret word**:\n- **User name**:');

		const agent = new Agent('custom-mem-thread-wm-recall')
			.model(getModel('anthropic'))
			.instructions(
				'You are a helpful assistant. Be concise. ' +
					'Always update your working memory with any important facts you learn.',
			)
			.memory(memory);

		const threadId = `custom-twm-recall-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'user-twm-recall' } };

		// Turn 1: share a fact — agent writes it into working memory
		await agent.generate('The secret word is COBALT. Remember it. Just acknowledge.', options);

		// Turn 2: filler turn — this pushes turn 1 out of the 1-message history window
		await agent.generate('Just say "ok".', options);

		// Turn 3: ask for the fact — only working memory can supply it now (turn 1 is truncated)
		const result = await agent.generate('What was the secret word I told you earlier?', options);
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('cobalt');
	});

	it('works with stream() path', async () => {
		const memory = new Memory().storage(store).lastMessages(10);

		const agent = new Agent('custom-mem-stream')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `custom-stream-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'user-stream' } };

		// Turn 1 via stream
		const result1 = await agent.stream('The capital of France is Paris. Acknowledge.', options);
		const reader = result1.stream.getReader();
		while (true) {
			const { done } = await reader.read();
			if (done) break;
		}

		// Turn 2 via generate — should recall from custom store
		const result = await agent.generate('What is the capital of France?', options);
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('paris');

		expect(store.messages.get(threadId)!.length).toBeGreaterThanOrEqual(2);
	});

	it('works when passed directly to agent.memory() as bare BuiltMemory', async () => {
		// Skip the Memory builder entirely — pass the raw BuiltMemory object
		const agent = new Agent('custom-mem-bare')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(store);

		const threadId = `custom-bare-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'user-bare' } };

		await agent.generate('Remember: the answer is 42. Acknowledge.', options);

		const result = await agent.generate('What is the answer?', options);
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('42');
	});
});
