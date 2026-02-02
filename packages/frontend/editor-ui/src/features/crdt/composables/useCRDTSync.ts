import { ref, onScopeDispose, type Ref } from 'vue';
import { createEventHook, type EventHookOn } from '@vueuse/core';
import {
	createCRDTProvider,
	CRDTEngine,
	ChangeOrigin,
	WorkerTransport,
	WebSocketTransport,
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	MESSAGE_INITIAL_SYNC,
	MESSAGE_DISCONNECTED,
	encodeMessage,
	decodeMessage,
	type SyncTransport,
	type CRDTDoc,
	type CRDTAwareness,
	type AwarenessState,
	type CRDTUndoManager,
	type UndoStackChangeEvent,
} from '@n8n/crdt';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as workers from '@/app/workers';

export type CRDTSyncState = 'idle' | 'connecting' | 'ready' | 'disconnected' | 'error';

/**
 * Transport type for CRDT sync.
 * - 'worker': Uses CRDT SharedWorker for cross-tab sync + server connection (default)
 * - 'websocket': Direct WebSocket connection to server (no cross-tab sync)
 * - 'coordinator': Uses Database Coordinator SharedWorker for Worker Mode (local-only, no server)
 * - 'coordinator-server': Uses Database Coordinator SharedWorker for Server Mode (WebSocket to server)
 */
export type CRDTTransportType = 'worker' | 'websocket' | 'coordinator' | 'coordinator-server';

export interface UseCRDTSyncOptions {
	docId: string;
	/** Auto-connect on creation. Default: true */
	immediate?: boolean;
	/** Sync to server. When false, only syncs between tabs (local-only mode). Default: true */
	serverSync?: boolean;
	/**
	 * Transport type for syncing. Default: 'worker'
	 * - 'worker': Uses SharedWorker for cross-tab sync + server connection
	 * - 'websocket': Direct WebSocket connection to server (no cross-tab sync)
	 */
	transport?: CRDTTransportType;
}

export interface UseCRDTSyncReturn {
	/** Current sync state (reactive) */
	state: Ref<CRDTSyncState>;
	/** Error message if state is 'error' (reactive) */
	error: Ref<string | null>;
	/** The CRDT document. Returns null if not ready. Not reactive - use state to track readiness. */
	readonly doc: CRDTDoc | null;
	/** The awareness instance for this document. Returns null if not ready. */
	readonly awareness: CRDTAwareness<AwarenessState> | null;
	/** Whether undo is possible (reactive) */
	canUndo: Ref<boolean>;
	/** Whether redo is possible (reactive) */
	canRedo: Ref<boolean>;
	/** Undo the last change. Returns true if undo was performed. */
	undo: () => boolean;
	/** Redo the last undone change. Returns true if redo was performed. */
	redo: () => boolean;
	/** Connect to server. Returns doc when ready. */
	connect: () => Promise<CRDTDoc>;
	/** Disconnect from server */
	disconnect: () => void;
	/** Register handler for when doc is ready (initial sync complete). Auto-cleanup on scope dispose. */
	onReady: EventHookOn<CRDTDoc>;
	/** Register handler for errors. Auto-cleanup on scope dispose. */
	onError: EventHookOn<Error>;
	/** Register handler for disconnection. Auto-cleanup on scope dispose. */
	onDisconnected: EventHookOn<void>;
}

// Singleton worker instance (shared across all useCRDTSync instances)
let sharedWorker: SharedWorker | null = null;
let fallbackWorker: Worker | null = null;

/**
 * Detect if SharedWorker is supported (Safari doesn't support it).
 */
function supportsSharedWorker(): boolean {
	return typeof SharedWorker !== 'undefined';
}

/**
 * Get or create the worker port.
 * Returns a MessagePort for SharedWorker or the Worker itself for fallback.
 */
function getWorkerPort(): MessagePort | Worker {
	if (supportsSharedWorker()) {
		sharedWorker ??= new SharedWorker(
			new URL('../workers/crdt.shared-worker.ts', import.meta.url),
			{ type: 'module', name: 'crdt-sync' },
		);
		return sharedWorker.port;
	} else {
		fallbackWorker ??= new Worker(new URL('../workers/crdt.worker.ts', import.meta.url), {
			type: 'module',
			name: 'crdt-sync-fallback',
		});
		return fallbackWorker;
	}
}

/**
 * Extended message types for execution control (legacy JSON protocol).
 */
interface ExecutionMessage {
	type: 'simulate-execution' | 'clear-executions';
	workflowDocId: string;
	nodeIds?: string[];
}

/**
 * Simulate execution for nodes in the worker.
 * The worker will update the execution doc which syncs to all tabs.
 */
export function simulateExecutionInWorker(workflowDocId: string, nodeIds: string[]): void {
	const port = getWorkerPort();
	const message: ExecutionMessage = { type: 'simulate-execution', workflowDocId, nodeIds };
	port.postMessage(message);
}

/**
 * Clear all executions for a workflow in the worker.
 */
export function clearExecutionsInWorker(workflowDocId: string): void {
	const port = getWorkerPort();
	const message: ExecutionMessage = { type: 'clear-executions', workflowDocId };
	port.postMessage(message);
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
 * // Option 1: Use event hooks (VueUse pattern - auto-cleanup on unmount)
 * crdt.onReady((doc) => {
 *   const nodesMap = doc.getMap('nodes');
 * });
 *
 * crdt.onError((err) => {
 *   console.error('CRDT error:', err);
 * });
 *
 * crdt.onDisconnected(() => {
 *   console.log('Disconnected from server');
 * });
 *
 * // Option 2: Use the promise-based API
 * const doc = await crdt.connect();
 * const nodesMap = doc.getMap('nodes');
 * ```
 */
export function useCRDTSync(options: UseCRDTSyncOptions): UseCRDTSyncReturn {
	const {
		docId,
		immediate = true,
		serverSync = true,
		transport: transportType = 'worker',
	} = options;
	const rootStore = useRootStore();

	const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

	// Event hooks (VueUse pattern - auto-cleanup on scope dispose)
	const readyHook = createEventHook<CRDTDoc>();
	const errorHook = createEventHook<Error>();
	const disconnectedHook = createEventHook();

	// Reactive state
	const state = ref<CRDTSyncState>('idle');
	const error = ref<string | null>(null);
	const canUndo = ref(false);
	const canRedo = ref(false);

	// Internal state (not reactive - CRDTDoc is a class that shouldn't be wrapped in Vue reactivity)
	let currentDoc: CRDTDoc | null = null;
	let currentAwareness: CRDTAwareness<AwarenessState> | null = null;
	let currentUndoManager: CRDTUndoManager | null = null;
	let transport: SyncTransport | null = null;
	let unsubscribeDoc: (() => void) | null = null;
	let unsubscribeAwareness: (() => void) | null = null;
	let unsubscribeTransportReceive: (() => void) | null = null;
	let unsubscribeDocSync: (() => void) | null = null;
	let unsubscribeUndoStackChange: (() => void) | null = null;
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
	 * Handle incoming messages from the transport.
	 * Includes sync/awareness data and control messages (initial-sync, disconnected).
	 */
	function handleTransportMessage(data: Uint8Array): void {
		if (!currentDoc) return;

		const { messageType, payload } = decodeMessage(data);

		switch (messageType) {
			case MESSAGE_SYNC:
				if (payload.length > 0) {
					console.log(
						'[useCRDTSync] Received MESSAGE_SYNC for docId:',
						docId,
						'payload size:',
						payload.length,
					);
					currentDoc.applyUpdate(payload);
					// Check resolvedParams after applying update
					const resolvedParamsMap = currentDoc.getMap('resolvedParams');
					console.log(
						'[useCRDTSync] After applyUpdate, resolvedParams size:',
						resolvedParamsMap.size,
					);
					for (const [key, value] of resolvedParamsMap.entries()) {
						console.log('[useCRDTSync] resolvedParams entry:', key, value);
					}
					// For WebSocket transport, mark synced on first sync message
					// (Worker transport sends explicit MESSAGE_INITIAL_SYNC)
					if (transportType === 'websocket' && !currentDoc.synced) {
						currentDoc.setSynced(true);
					}
				}
				break;

			case MESSAGE_AWARENESS:
				if (payload.length > 0 && currentAwareness) {
					currentAwareness.applyUpdate(payload);
				}
				break;

			case MESSAGE_INITIAL_SYNC:
				// Initial sync complete - mark doc as synced (from Worker transport)
				currentDoc.setSynced(true);
				break;

			case MESSAGE_DISCONNECTED:
				// Connection lost - mark doc as not synced (from Worker transport)
				currentDoc.setSynced(false);
				break;
		}
	}

	/**
	 * Handle doc sync state changes - update reactive state, trigger hooks, resolve promises.
	 */
	function handleDocSyncChange(isSynced: boolean): void {
		if (isSynced) {
			state.value = 'ready';
			if (currentDoc) {
				// Trigger onReady FIRST so consumers can access doc.getMap('nodes') etc.
				// This ensures the types exist in yDoc.share before undo manager is created.
				void readyHook.trigger(currentDoc);
				if (connectPromiseResolve) {
					connectPromiseResolve(currentDoc);
					connectPromiseResolve = null;
					connectPromiseReject = null;
				}

				// Create undo manager AFTER onReady handlers have run
				// The Yjs UndoManager scopes to types that exist at creation time,
				// so we need the 'nodes' map to be accessed first
				if (!currentUndoManager) {
					currentUndoManager = currentDoc.createUndoManager({ captureTimeout: 500 });
					// Clear any initialization artifacts from the undo stack.
					// During sync, accessing maps via getMap() may create transactions
					// that get captured by the undo manager before it fully initializes.
					currentUndoManager.clear();
					unsubscribeUndoStackChange = currentUndoManager.onStackChange(
						(event: UndoStackChangeEvent) => {
							canUndo.value = event.canUndo;
							canRedo.value = event.canRedo;
						},
					);
				}
			}
		} else {
			state.value = 'disconnected';
			void disconnectedHook.trigger();
		}
	}

	/**
	 * Handle local document updates - send to transport for broadcast.
	 * Broadcasts both local changes and undo/redo operations to other users.
	 * Only filters out remote changes (to avoid echo).
	 */
	function handleDocUpdate(update: Uint8Array, origin: ChangeOrigin): void {
		if (origin === ChangeOrigin.remote || !transport?.connected) return;
		transport.send(encodeMessage(MESSAGE_SYNC, update));
	}

	/**
	 * Handle local awareness updates - send to transport for broadcast.
	 */
	function handleAwarenessUpdate(update: Uint8Array, origin: ChangeOrigin): void {
		if (origin !== ChangeOrigin.local || !transport?.connected) return;
		transport.send(encodeMessage(MESSAGE_AWARENESS, update));
	}

	/**
	 * Create the transport based on the transport type.
	 * This is a separate async function to handle coordinator port retrieval.
	 */
	async function createTransport(): Promise<SyncTransport> {
		const serverUrl = serverSync ? getServerUrl() : '';

		if (transportType === 'websocket') {
			// Direct WebSocket connection (no cross-tab sync)
			return new WebSocketTransport({
				url: serverUrl,
				reconnect: true,
			});
		} else if (transportType === 'coordinator') {
			// Coordinator transport (Worker Mode - local-only, uses Database Coordinator)
			// Get a MessagePort from the Coordinator SharedWorker
			const coordinatorPort = await workers.getCrdtPort();
			return new WorkerTransport({
				port: coordinatorPort,
				docId,
				serverUrl: rootStore.baseUrl, // Used by coordinator for REST API calls (REST URL = worker mode)
			});
		} else if (transportType === 'coordinator-server') {
			// Coordinator transport (Server Mode - WebSocket proxy via Coordinator)
			// Pass WebSocket URL so coordinator uses server mode (proxies to WebSocket server)
			const coordinatorPort = await workers.getCrdtPort();
			return new WorkerTransport({
				port: coordinatorPort,
				docId,
				serverUrl: getServerUrl(), // WebSocket URL = server mode (coordinator proxies to server)
			});
		} else {
			// Worker transport (cross-tab sync via CRDT SharedWorker)
			return new WorkerTransport({
				port: getWorkerPort(),
				docId,
				serverUrl,
			});
		}
	}

	/**
	 * Connect and start syncing.
	 * @returns Promise that resolves with the doc when initial sync is complete
	 */
	async function connect(): Promise<CRDTDoc> {
		// If already connected/connecting, return existing promise or resolve immediately
		if (state.value === 'ready' && currentDoc) {
			return currentDoc;
		}

		if (state.value === 'connecting') {
			// Return a new promise that will resolve when connection completes
			return await new Promise((resolve, reject) => {
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

		return await new Promise((resolve, reject) => {
			connectPromiseResolve = resolve;
			connectPromiseReject = reject;

			void (async () => {
				try {
					// Create local document
					currentDoc = provider.createDoc(docId);

					// Get awareness instance
					currentAwareness = currentDoc.getAwareness();

					// Note: Undo manager is created in handleDocSyncChange AFTER initial sync
					// because Yjs UndoManager scopes to types that exist at creation time

					// Subscribe to local document changes
					unsubscribeDoc = currentDoc.onUpdate(handleDocUpdate);

					// Subscribe to local awareness changes
					unsubscribeAwareness = currentAwareness.onUpdate(handleAwarenessUpdate);

					// Subscribe to doc sync state changes
					unsubscribeDocSync = currentDoc.onSync(handleDocSyncChange);

					// Create transport (may be async for coordinator type)
					transport = await createTransport();

					// Wire up transport to receive messages
					unsubscribeTransportReceive = transport.onReceive(handleTransportMessage);

					// Connect transport
					void transport.connect();
				} catch (caughtError) {
					state.value = 'error';
					const err = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
					error.value = err.message;
					void errorHook.trigger(err);
					reject(err);
					connectPromiseResolve = null;
					connectPromiseReject = null;
				}
			})();
		});
	}

	/**
	 * Disconnect and cleanup.
	 */
	function disconnect(): void {
		// Destroy awareness FIRST while transport is still connected
		// This sends the awareness removal update to the SharedWorker
		if (currentAwareness) {
			currentAwareness.destroy();
			currentAwareness = null;
		}

		// Now unsubscribe from awareness updates (after destroy sent the removal)
		unsubscribeAwareness?.();
		unsubscribeAwareness = null;

		// Disconnect transport (sends UNSUBSCRIBE message)
		transport?.disconnect();
		transport = null;

		unsubscribeTransportReceive?.();
		unsubscribeTransportReceive = null;

		unsubscribeDocSync?.();
		unsubscribeDocSync = null;

		unsubscribeDoc?.();
		unsubscribeDoc = null;

		unsubscribeUndoStackChange?.();
		unsubscribeUndoStackChange = null;

		if (currentUndoManager) {
			currentUndoManager.destroy();
			currentUndoManager = null;
		}

		if (currentDoc) {
			currentDoc.destroy();
			currentDoc = null;
		}

		// Reset undo/redo state
		canUndo.value = false;
		canRedo.value = false;

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

	/**
	 * Undo the last change.
	 */
	function undo(): boolean {
		return currentUndoManager?.undo() ?? false;
	}

	/**
	 * Redo the last undone change.
	 */
	function redo(): boolean {
		return currentUndoManager?.redo() ?? false;
	}

	return {
		state,
		error,
		get doc() {
			return currentDoc;
		},
		get awareness() {
			return currentAwareness;
		},
		canUndo,
		canRedo,
		undo,
		redo,
		connect,
		disconnect,
		onReady: readyHook.on,
		onError: errorHook.on,
		onDisconnected: disconnectedHook.on,
	};
}
