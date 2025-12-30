import { ref, onScopeDispose, type Ref } from 'vue';
import { createCRDTProvider, CRDTEngine, ChangeOrigin, type CRDTDoc } from '@n8n/crdt/browser';
import { useRootStore } from '@n8n/stores/useRootStore';

export type CRDTSyncState = 'idle' | 'connecting' | 'ready' | 'disconnected' | 'error';

export interface UseCRDTSyncOptions {
	docId: string;
	/** Auto-connect on creation. Default: true */
	immediate?: boolean;
	/** Sync to server. When false, only syncs between tabs (local-only mode). Default: true */
	serverSync?: boolean;
}

export interface UseCRDTSyncReturn {
	/** Current sync state (reactive) */
	state: Ref<CRDTSyncState>;
	/** Error message if state is 'error' (reactive) */
	error: Ref<string | null>;
	/** The CRDT document. Returns null if not ready. Not reactive - use state to track readiness. */
	readonly doc: CRDTDoc | null;
	/** Connect to server. Returns doc when ready. */
	connect: () => Promise<CRDTDoc>;
	/** Disconnect from server */
	disconnect: () => void;
}

/**
 * Worker message types for communication between main thread and worker.
 */
interface WorkerMessage {
	type: 'subscribe' | 'unsubscribe' | 'sync' | 'connected' | 'disconnected' | 'initial-sync';
	docId: string;
	serverUrl?: string;
	data?: Uint8Array;
}

// Singleton worker instance (shared across all useCRDTSync instances)
let sharedWorker: SharedWorker | null = null;
let fallbackWorker: Worker | null = null;
const workerMessageHandlers = new Map<string, Set<(message: WorkerMessage) => void>>();

/**
 * Detect if SharedWorker is supported (Safari doesn't support it).
 */
function supportsSharedWorker(): boolean {
	return typeof SharedWorker !== 'undefined';
}

/**
 * Get or create the worker instance.
 */
function getWorker(): { port: MessagePort | Worker; isShared: boolean } {
	if (supportsSharedWorker()) {
		if (!sharedWorker) {
			sharedWorker = new SharedWorker(
				new URL('../workers/crdt.shared-worker.ts', import.meta.url),
				{ type: 'module', name: 'crdt-sync' },
			);

			sharedWorker.port.onmessage = (event) => {
				const message = event.data as WorkerMessage;
				const handlers = workerMessageHandlers.get(message.docId);
				if (handlers) {
					for (const handler of handlers) {
						handler(message);
					}
				}
			};

			sharedWorker.port.start();
		}
		return { port: sharedWorker.port, isShared: true };
	} else {
		if (!fallbackWorker) {
			fallbackWorker = new Worker(new URL('../workers/crdt.worker.ts', import.meta.url), {
				type: 'module',
				name: 'crdt-sync-fallback',
			});

			fallbackWorker.onmessage = (event) => {
				const message = event.data as WorkerMessage;
				const handlers = workerMessageHandlers.get(message.docId);
				if (handlers) {
					for (const handler of handlers) {
						handler(message);
					}
				}
			};
		}
		return { port: fallbackWorker, isShared: false };
	}
}

/**
 * Register a message handler for a specific document.
 */
function registerHandler(docId: string, handler: (message: WorkerMessage) => void): () => void {
	let handlers = workerMessageHandlers.get(docId);
	if (!handlers) {
		handlers = new Set();
		workerMessageHandlers.set(docId, handlers);
	}
	handlers.add(handler);

	return () => {
		handlers?.delete(handler);
		if (handlers?.size === 0) {
			workerMessageHandlers.delete(docId);
		}
	};
}

/**
 * Send a message to the worker.
 */
function sendToWorker(message: WorkerMessage): void {
	const { port } = getWorker();
	port.postMessage(message);
}

/**
 * Extended message types for execution control.
 */
interface ExecutionMessage {
	type: 'simulate-execution' | 'clear-executions';
	workflowDocId: string;
	nodeIds?: string[];
}

/**
 * Send an execution control message to the worker.
 */
function sendExecutionMessage(message: ExecutionMessage): void {
	const { port } = getWorker();
	port.postMessage(message);
}

/**
 * Simulate execution for nodes in the worker.
 * The worker will update the execution doc which syncs to all tabs.
 */
export function simulateExecutionInWorker(workflowDocId: string, nodeIds: string[]): void {
	sendExecutionMessage({ type: 'simulate-execution', workflowDocId, nodeIds });
}

/**
 * Clear all executions for a workflow in the worker.
 */
export function clearExecutionsInWorker(workflowDocId: string): void {
	sendExecutionMessage({ type: 'clear-executions', workflowDocId });
}

/**
 * Composable for CRDT document synchronization via SharedWorker.
 *
 * Uses SharedWorker for cross-tab sync with automatic Safari fallback
 * to regular Worker + BroadcastChannel.
 *
 * @example
 * ```ts
 * const crdt = useCRDTSync({ docId: 'workflow-123' });
 *
 * // Option 1: Watch state for readiness, then access doc
 * watch(() => crdt.state.value, (state) => {
 *   if (state === 'ready' && crdt.doc) {
 *     const nodesMap = crdt.doc.getMap('nodes');
 *   }
 * });
 *
 * // Option 2: Use the promise-based API
 * const doc = await crdt.connect();
 * const nodesMap = doc.getMap('nodes');
 * ```
 */
export function useCRDTSync(options: UseCRDTSyncOptions): UseCRDTSyncReturn {
	const { docId, immediate = true, serverSync = true } = options;
	const rootStore = useRootStore();

	const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

	// Reactive state
	const state = ref<CRDTSyncState>('idle');
	const error = ref<string | null>(null);

	// Internal state (not reactive - CRDTDoc is a class that shouldn't be wrapped in Vue reactivity)
	let currentDoc: CRDTDoc | null = null;
	let unsubscribeDoc: (() => void) | null = null;
	let unsubscribeWorker: (() => void) | null = null;
	let connectPromiseResolve: ((resolvedDoc: CRDTDoc) => void) | null = null;
	let connectPromiseReject: ((rejectedError: Error) => void) | null = null;

	function getServerUrl(): string {
		const restUrl = rootStore.restUrl;
		const { protocol, host } = window.location;
		const baseUrl = restUrl.startsWith('http')
			? restUrl.replace(/^http/, 'ws')
			: `${protocol === 'https:' ? 'wss' : 'ws'}://${host + restUrl}`;
		return `${baseUrl}/crdt?docId=${encodeURIComponent(docId)}`;
	}

	/**
	 * Handle messages from the worker.
	 */
	function handleWorkerMessage(message: WorkerMessage): void {
		if (!currentDoc) return;

		switch (message.type) {
			case 'sync':
				if (message.data && message.data.length > 0) {
					currentDoc.applyUpdate(message.data);
				}
				break;

			case 'connected':
				// Connected but waiting for initial sync
				break;

			case 'disconnected':
				state.value = 'disconnected';
				break;

			case 'initial-sync':
				state.value = 'ready';
				if (connectPromiseResolve && currentDoc) {
					connectPromiseResolve(currentDoc);
					connectPromiseResolve = null;
					connectPromiseReject = null;
				}
				break;
		}
	}

	/**
	 * Handle local document updates - send to worker for broadcast.
	 */
	function handleDocUpdate(update: Uint8Array, origin: ChangeOrigin): void {
		if (origin !== ChangeOrigin.local) return;
		sendToWorker({ type: 'sync', docId, data: update });
	}

	/**
	 * Connect and start syncing.
	 * @returns Promise that resolves with the doc when initial sync is complete
	 */
	// eslint-disable-next-line @typescript-eslint/promise-function-async -- Intentionally uses deferred promise pattern
	function connect(): Promise<CRDTDoc> {
		// If already connected/connecting, return existing promise or resolve immediately
		if (state.value === 'ready' && currentDoc) {
			return Promise.resolve(currentDoc);
		}

		if (state.value === 'connecting') {
			// Return a new promise that will resolve when connection completes
			return new Promise((resolve, reject) => {
				const prevResolve = connectPromiseResolve;
				const prevReject = connectPromiseReject;
				connectPromiseResolve = (resolvedDoc) => {
					prevResolve?.(resolvedDoc);
					resolve(resolvedDoc);
				};
				connectPromiseReject = (rejectedError) => {
					prevReject?.(rejectedError);
					reject(rejectedError);
				};
			});
		}

		state.value = 'connecting';
		error.value = null;

		return new Promise((resolve, reject) => {
			connectPromiseResolve = resolve;
			connectPromiseReject = reject;

			try {
				// Create local document
				currentDoc = provider.createDoc(docId);

				// Subscribe to local document changes
				unsubscribeDoc = currentDoc.onUpdate(handleDocUpdate);

				// Register handler for worker messages
				unsubscribeWorker = registerHandler(docId, handleWorkerMessage);

				// Subscribe to document in worker
				// Empty serverUrl means local-only (cross-tab sync only, no server)
				const serverUrl = serverSync ? getServerUrl() : '';
				sendToWorker({ type: 'subscribe', docId, serverUrl });
			} catch (caughtError) {
				state.value = 'error';
				error.value = caughtError instanceof Error ? caughtError.message : String(caughtError);
				reject(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
				connectPromiseResolve = null;
				connectPromiseReject = null;
			}
		});
	}

	/**
	 * Disconnect and cleanup.
	 */
	function disconnect(): void {
		sendToWorker({ type: 'unsubscribe', docId });

		unsubscribeWorker?.();
		unsubscribeWorker = null;

		unsubscribeDoc?.();
		unsubscribeDoc = null;

		if (currentDoc) {
			currentDoc.destroy();
			currentDoc = null;
		}

		state.value = 'disconnected';

		// Reject pending connect promise
		if (connectPromiseReject) {
			connectPromiseReject(new Error('Disconnected'));
			connectPromiseResolve = null;
			connectPromiseReject = null;
		}
	}

	// Auto-cleanup on scope dispose
	onScopeDispose(() => {
		disconnect();
	});

	// Auto-connect if immediate
	if (immediate) {
		void connect();
	}

	return {
		state,
		error,
		get doc() {
			return currentDoc;
		},
		connect,
		disconnect,
	};
}
