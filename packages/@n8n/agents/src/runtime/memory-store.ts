import type { AgentMessage } from '../message';
import type { BuiltMemory, Thread } from '../types';

/**
 * In-memory implementation of BuiltMemory.
 * All data is lost on process restart — suitable for development and testing.
 *
 * Thread context for `saveMessages` is established by calling `saveThread` first.
 * The most recently saved thread is used when `saveMessages` is called.
 */
export class InMemoryMemory implements BuiltMemory {
	private threads = new Map<string, Thread>();

	private messagesByThread = new Map<string, AgentMessage[]>();

	async getThread(threadId: string): Promise<Thread | null> {
		return this.threads.get(threadId) ?? null;
	}

	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		const existing = this.threads.get(thread.id);
		const now = new Date();
		const saved: Thread = {
			...thread,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.threads.set(thread.id, saved);
		return saved;
	}

	async deleteThread(threadId: string): Promise<void> {
		this.threads.delete(threadId);
		this.messagesByThread.delete(threadId);
	}

	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentMessage[]> {
		const all = this.messagesByThread.get(threadId) ?? [];
		// `before` cursor not meaningful for in-memory store (messages have no timestamps)
		if (opts?.limit) return all.slice(-opts.limit);
		return [...all];
	}

	/**
	 * Save messages to the thread established by the most recent `saveThread` call.
	 * Always call `saveThread` before `saveMessages` to set the thread context.
	 */
	async saveMessages(threadId: string, messages: AgentMessage[]): Promise<void> {
		const existing = this.messagesByThread.get(threadId) ?? [];
		existing.push(...messages);
		this.messagesByThread.set(threadId, existing);
	}

	async deleteMessages(threadId: string, messageIds: string[]): Promise<void> {
		const idSet = new Set(messageIds);
		const existing = this.messagesByThread.get(threadId) ?? [];
		this.messagesByThread.set(
			threadId,
			existing.filter((m) => {
				const id = (m as unknown as { id?: string }).id;
				return !id || !idSet.has(id);
			}),
		);
	}
}

/**
 * Save messages to a specific thread, ensuring the thread exists first.
 * Always call this instead of `memory.saveMessages()` directly, as it
 * establishes the thread context required by implementations like InMemoryMemory.
 */
export async function saveMessagesToThread(
	memory: BuiltMemory,
	threadId: string,
	resourceId: string,
	messages: AgentMessage[],
): Promise<void> {
	await memory.saveThread({ id: threadId, resourceId });
	await memory.saveMessages(threadId, messages);
}
