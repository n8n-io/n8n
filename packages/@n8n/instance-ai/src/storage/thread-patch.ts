import type { StorageThreadType } from '@mastra/core/memory';
import type { Memory } from '@mastra/memory';

export interface ThreadPatch {
	title?: string;
	metadata?: Record<string, unknown>;
}

export interface PatchableThreadMemory extends Memory {
	patchThread?: (args: {
		threadId: string;
		update: (current: StorageThreadType) => ThreadPatch | null | undefined;
	}) => Promise<StorageThreadType | null>;
}

interface PatchableThreadStore {
	patchThread?: (args: {
		threadId: string;
		update: (current: StorageThreadType) => ThreadPatch | null | undefined;
	}) => Promise<StorageThreadType | null>;
}

function isPatchableThreadMemory(memory: Memory): memory is PatchableThreadMemory {
	return typeof memory === 'object' && memory !== null && 'patchThread' in memory;
}

function isPatchableThreadStore(store: unknown): store is PatchableThreadStore {
	return (
		typeof store === 'object' &&
		store !== null &&
		'patchThread' in store &&
		typeof Reflect.get(store, 'patchThread') === 'function'
	);
}

function getMethod(target: object, key: string): ((...args: never[]) => unknown) | null {
	const value: unknown = Reflect.get(target, key);
	if (typeof value !== 'function') return null;

	return (...args: never[]) => {
		const result: unknown = Reflect.apply(value, target, args);
		return result;
	};
}

export async function patchThread(
	memory: Memory,
	args: {
		threadId: string;
		update: (current: StorageThreadType) => ThreadPatch | null | undefined;
	},
): Promise<StorageThreadType | null> {
	if (isPatchableThreadMemory(memory) && typeof memory.patchThread === 'function') {
		return await memory.patchThread(args);
	}

	if (typeof memory === 'object' && memory !== null && 'getMemoryStore' in memory) {
		const getMemoryStore = getMethod(memory, 'getMemoryStore');
		if (getMemoryStore) {
			const memoryStore = await getMemoryStore();
			if (isPatchableThreadStore(memoryStore) && typeof memoryStore.patchThread === 'function') {
				return await memoryStore.patchThread(args);
			}
		}
	}

	const thread = await memory.getThreadById({ threadId: args.threadId });
	if (!thread) return null;

	const patch = args.update({
		...thread,
		metadata: { ...(thread.metadata ?? {}) },
	});
	if (!patch) return thread;

	return await memory.updateThread({
		id: args.threadId,
		title: patch.title ?? thread.title ?? args.threadId,
		metadata: patch.metadata ?? thread.metadata ?? {},
	});
}
