import type {
	ElectronApi,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
} from '../../shared/types';

type ThreadBridge = Pick<
	ElectronApi,
	'getThread' | 'listenToThread' | 'unlistenToThread' | 'onThreadEvent'
>;

export type ThreadListener = (event: InstanceAiEvent) => void;

/**
 * Renderer-side client of the main-process ThreadService. Holds the listener registry
 * (callbacks can't cross IPC) and refcounts it: the first listener of a thread opens
 * the SSE stream in the main process, removing the last one closes it.
 *
 * Typical view usage:
 *   const snapshot = await client.get(threadId);                    // cached after first fetch
 *   client.listen(threadId, onEvent, { lastEventId: snapshot.nextEventId });
 *   // …on unmount:
 *   client.unlisten(threadId, onEvent);
 */
export class ThreadClient {
	private readonly listeners = new Map<string, Set<ThreadListener>>();

	constructor(private readonly bridge: ThreadBridge) {
		this.bridge.onThreadEvent((threadId, event) => {
			const threadListeners = this.listeners.get(threadId);
			if (!threadListeners) return;
			for (const listener of threadListeners) listener(event);
		});
	}

	/** The thread's message snapshot, served from the main-process cache after the first fetch. */
	async get(
		threadId: string,
		options?: { refresh?: boolean },
	): Promise<InstanceAiRichMessagesResponse> {
		return await this.bridge.getThread(threadId, options);
	}

	/**
	 * Register a listener for the thread's events. The first listener opens the SSE
	 * stream, optionally from `lastEventId` (a later listener's cursor is ignored —
	 * the stream is already open; without one the server replays the whole thread).
	 */
	listen(threadId: string, listener: ThreadListener, options?: { lastEventId?: number }): void {
		let threadListeners = this.listeners.get(threadId);
		if (!threadListeners) {
			threadListeners = new Set();
			this.listeners.set(threadId, threadListeners);
			this.bridge.listenToThread(threadId, options?.lastEventId).catch((error: unknown) => {
				console.error('Failed to open thread event stream', threadId, error);
			});
		}
		threadListeners.add(listener);
	}

	/** Remove a listener; closing the SSE stream when it was the thread's last one. Unknown listeners are a no-op. */
	unlisten(threadId: string, listener: ThreadListener): void {
		const threadListeners = this.listeners.get(threadId);
		if (!threadListeners?.delete(listener)) return;
		if (threadListeners.size > 0) return;
		this.listeners.delete(threadId);
		this.bridge.unlistenToThread(threadId).catch((error: unknown) => {
			console.error('Failed to close thread event stream', threadId, error);
		});
	}
}

let threadClient: ThreadClient | undefined;

/** The app-wide ThreadClient over the preload bridge, created on first use. */
export function getThreadClient(): ThreadClient {
	threadClient ??= new ThreadClient(window.electronAPI);
	return threadClient;
}
