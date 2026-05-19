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
}

function isPatchableThreadMemory(memory: PatchableThreadMemory): memory is {
	patchThread: (args: {
		threadId: string;
		update: (current: ThreadRecord) => ThreadPatch | null | undefined;
	}) => Promise<ThreadRecord | null>;
} {
	return typeof memory.patchThread === 'function';
}

function hasNativeThreadMethods(memory: PatchableThreadMemory): memory is {
	getThread: (threadId: string) => Promise<ThreadRecord | null>;
	saveThread: (thread: ThreadRecord) => Promise<ThreadRecord | undefined>;
} {
	return typeof memory.getThread === 'function' && typeof memory.saveThread === 'function';
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

	if (hasNativeThreadMethods(memory)) {
		const thread = await memory.getThread(args.threadId);
		if (!thread) return null;

		const patch = args.update(cloneThreadForUpdate(thread));
		if (!patch) return thread;

		const updated = applyPatch(args.threadId, thread, patch);
		await memory.saveThread(updated);
		return updated;
	}

	throw new Error('Memory does not support patching threads');
}

function hasGetThread(memory: PatchableThreadMemory): memory is {
	getThread: (threadId: string) => Promise<ThreadRecord | null>;
} {
	return typeof memory.getThread === 'function';
}
