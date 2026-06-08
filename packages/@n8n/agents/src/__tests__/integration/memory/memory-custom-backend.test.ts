/**
 * Integration test: custom BuiltMemory backend.
 *
 * Proves that any object implementing the BuiltMemory interface works with the
 * agent runtime — no SDK-provided storage class needed. This is the contract
 * that Redis, DynamoDB, TypeORM, or any other persistence layer must satisfy.
 */
import { expect, it, beforeEach } from 'vitest';

import { Agent, Memory, type AgentDbMessage } from '../../../index';
import type { BuiltMemory, MemoryDescriptor, Thread } from '../../../types/sdk/memory';
import { describeIf, findLastTextContent, getModel } from '../helpers';

const describe = describeIf('anthropic');

// ---------------------------------------------------------------------------
// Custom in-memory BuiltMemory implementation (simulates Redis, DynamoDB, etc.)
// ---------------------------------------------------------------------------
class CustomMapMemory implements BuiltMemory {
	describe(): MemoryDescriptor {
		throw new Error('Method not implemented.');
	}
	readonly threads = new Map<string, Thread>();
	readonly messages = new Map<string, AgentDbMessage[]>();

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
		return msgs;
	}

	async saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentDbMessage[];
	}): Promise<void> {
		const existing = this.messages.get(args.threadId) ?? [];
		this.messages.set(args.threadId, [...existing, ...args.messages]);
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
		const memory = new Memory().storage(store);

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
		const memory = new Memory().storage(store);

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

	it('works with stream() path', async () => {
		const memory = new Memory().storage(store);

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
