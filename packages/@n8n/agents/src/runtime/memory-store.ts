import { toDbMessage } from '../sdk/message';
import type { BuiltMemory, Thread } from '../types';
import type { AgentDbMessage, AgentMessage } from '../types/sdk/message';

interface StoredMessage {
	message: AgentDbMessage;
	createdAt: Date;
}

/**
 * In-memory implementation of BuiltMemory.
 * All data is lost on process restart — suitable for development and testing.
 *
 * Thread context for `saveMessages` is established by calling `saveThread` first.
 * The most recently saved thread is used when `saveMessages` is called.
 */
export class InMemoryMemory implements BuiltMemory {
	private threads = new Map<string, Thread>();

	private messagesByThread = new Map<string, StoredMessage[]>();

	private workingMemoryByKey = new Map<string, string>();

	// eslint-disable-next-line @typescript-eslint/require-await
	async getWorkingMemory(params: { threadId: string; resourceId?: string }): Promise<
		string | null
	> {
		return this.workingMemoryByKey.get(params.resourceId ?? params.threadId) ?? null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async saveWorkingMemory(
		params: { threadId: string; resourceId?: string },
		content: string,
	): Promise<void> {
		this.workingMemoryByKey.set(params.resourceId ?? params.threadId, content);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getThread(threadId: string): Promise<Thread | null> {
		return this.threads.get(threadId) ?? null;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async saveThread(thread: Omit<Thread, 'createdAt' | 'updatedAt'>): Promise<Thread> {
		const existing = this.threads.get(thread.id);
		const now = new Date();
		const saved: Thread = {
			...thread,
			title: thread.title ?? existing?.title,
			metadata: thread.metadata ?? existing?.metadata,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.threads.set(thread.id, saved);
		return saved;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async deleteThread(threadId: string): Promise<void> {
		this.threads.delete(threadId);
		this.messagesByThread.delete(threadId);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getMessages(
		threadId: string,
		opts?: { limit?: number; before?: Date },
	): Promise<AgentDbMessage[]> {
		let stored = this.messagesByThread.get(threadId) ?? [];
		if (opts?.before) {
			const cutoff = opts.before.getTime();
			stored = stored.filter((s) => s.createdAt.getTime() < cutoff);
		}
		if (opts?.limit) stored = stored.slice(-opts.limit);
		return stored.map((s) => s.message);
	}

	/**
	 * Save messages to the thread established by the most recent `saveThread` call.
	 * Always call `saveThread` before `saveMessages` to set the thread context.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	async saveMessages(args: {
		threadId: string;
		resourceId?: string;
		messages: AgentMessage[];
	}): Promise<void> {
		const existing = this.messagesByThread.get(args.threadId) ?? [];
		const now = new Date();
		for (const msg of args.messages) {
			existing.push({ message: toDbMessage(msg), createdAt: now });
		}
		this.messagesByThread.set(args.threadId, existing);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async deleteMessages(messageIds: string[]): Promise<void> {
		const idSet = new Set(messageIds);
		for (const [threadId, messages] of this.messagesByThread.entries()) {
			this.messagesByThread.set(
				threadId,
				messages.filter((s) => !idSet.has(s.message.id)),
			);
		}
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
	await memory.saveMessages({ threadId, resourceId, messages });
}
