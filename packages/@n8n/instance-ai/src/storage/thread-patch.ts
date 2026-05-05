export interface ThreadRecord {
	id: string;
	title?: string;
	metadata?: Record<string, unknown>;
	resourceId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ThreadPatch {
	title?: string;
	metadata?: Record<string, unknown>;
}

export interface PatchableThreadMemory {
	patchThread?: unknown;
	getThread?: unknown;
	saveThread?: unknown;
	getThreadById?: unknown;
	updateThread?: unknown;
}

interface PatchableThreadStore {
	patchThread?: (args: {
		threadId: string;
		update: (current: ThreadRecord) => ThreadPatch | null | undefined;
	}) => Promise<ThreadRecord | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPatchableThreadMemory(memory: PatchableThreadMemory): memory is {
	patchThread: (args: {
		threadId: string;
		update: (current: ThreadRecord) => ThreadPatch | null | undefined;
	}) => Promise<ThreadRecord | null>;
} {
	return typeof memory.patchThread === 'function';
}

function isPatchableThreadStore(store: unknown): store is PatchableThreadStore & {
	patchThread: NonNullable<PatchableThreadStore['patchThread']>;
} {
	return isRecord(store) && typeof store.patchThread === 'function';
}

function hasNativeThreadMethods(memory: PatchableThreadMemory): memory is {
	getThread: (threadId: string) => Promise<ThreadRecord | null>;
	saveThread: (thread: ThreadRecord) => Promise<ThreadRecord | undefined>;
} {
	return typeof memory.getThread === 'function' && typeof memory.saveThread === 'function';
}

function hasLegacyThreadMethods(memory: PatchableThreadMemory): memory is {
	getThreadById: (args: { threadId: string }) => Promise<ThreadRecord | null>;
	updateThread: (args: {
		id: string;
		title: string;
		metadata: Record<string, unknown>;
	}) => Promise<ThreadRecord | null>;
} {
	return typeof memory.getThreadById === 'function' && typeof memory.updateThread === 'function';
}

function cloneThreadForUpdate(thread: ThreadRecord): ThreadRecord {
	return {
		...thread,
		metadata: { ...(thread.metadata ?? {}) },
	};
}

function applyPatch(threadId: string, thread: ThreadRecord, patch: ThreadPatch): ThreadRecord {
	return {
		...thread,
		id: thread.id || threadId,
		title: patch.title ?? thread.title ?? threadId,
		metadata: patch.metadata ?? thread.metadata ?? {},
	};
}

export async function getThread(
	memory: PatchableThreadMemory,
	threadId: string,
): Promise<ThreadRecord | null> {
	if (hasGetThread(memory)) {
		return await memory.getThread(threadId);
	}

	if (hasGetThreadById(memory)) {
		return await memory.getThreadById({ threadId });
	}

	throw new Error('Memory does not support reading threads');
}

export async function patchThread(
	memory: PatchableThreadMemory,
	args: {
		threadId: string;
		update: (current: ThreadRecord) => ThreadPatch | null | undefined;
	},
): Promise<ThreadRecord | null> {
	if (isPatchableThreadMemory(memory)) {
		return await memory.patchThread(args);
	}

	if (hasGetMemoryStore(memory)) {
		const memoryStore = await memory.getMemoryStore();
		if (isPatchableThreadStore(memoryStore)) {
			return await memoryStore.patchThread(args);
		}
	}

	if (hasNativeThreadMethods(memory)) {
		const thread = await memory.getThread(args.threadId);
		if (!thread) return null;

		const patch = args.update(cloneThreadForUpdate(thread));
		if (!patch) return thread;

		const updated = applyPatch(args.threadId, thread, patch);
		await memory.saveThread(updated);
		return updated;
	}

	if (hasLegacyThreadMethods(memory)) {
		const thread = await memory.getThreadById({ threadId: args.threadId });
		if (!thread) return null;

		const patch = args.update(cloneThreadForUpdate(thread));
		if (!patch) return thread;

		return await memory.updateThread({
			id: args.threadId,
			title: patch.title ?? thread.title ?? args.threadId,
			metadata: patch.metadata ?? thread.metadata ?? {},
		});
	}

	throw new Error('Memory does not support patching threads');
}

function hasGetThread(memory: PatchableThreadMemory): memory is {
	getThread: (threadId: string) => Promise<ThreadRecord | null>;
} {
	return typeof memory.getThread === 'function';
}

function hasGetThreadById(memory: PatchableThreadMemory): memory is {
	getThreadById: (args: { threadId: string }) => Promise<ThreadRecord | null>;
} {
	return typeof memory.getThreadById === 'function';
}

function hasGetMemoryStore(memory: PatchableThreadMemory): memory is PatchableThreadMemory & {
	getMemoryStore: () => Promise<unknown>;
} {
	return isRecord(memory) && typeof memory.getMemoryStore === 'function';
}
