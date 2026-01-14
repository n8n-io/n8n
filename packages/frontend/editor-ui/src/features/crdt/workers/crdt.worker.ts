/**
 * CRDT Worker (Safari Fallback) - Regular Worker with BroadcastChannel for cross-tab sync.
 *
 * Safari doesn't support SharedWorker, so we use a regular Worker per tab
 * combined with BroadcastChannel for cross-tab synchronization.
 *
 * Architecture:
 * - Each tab has its own Worker instance
 * - Workers communicate via BroadcastChannel for cross-tab sync
 * - Each Worker maintains its own server connection (but only one will "win" for sending)
 * - The first tab to connect becomes the "leader" for server communication
 *
 * Binary Message Protocol:
 * Format: [messageType: u8, docIdLen: u16, docId: utf8, payload]
 *
 * Message Types:
 * - 0 (SYNC): CRDT document update (payload = Yjs update bytes)
 * - 1 (AWARENESS): Presence/cursor update (payload = awareness bytes)
 * - 2 (SUBSCRIBE): Subscribe to document (payload = serverUrl as utf8)
 * - 3 (UNSUBSCRIBE): Unsubscribe from document (payload = empty)
 * - 4 (CONNECTED): Server connected notification (worker → tab)
 * - 5 (DISCONNECTED): Server disconnected notification (worker → tab)
 * - 6 (INITIAL_SYNC): Initial sync complete notification (worker → tab)
 */

/// <reference lib="webworker" />

import {
	createCRDTProvider,
	CRDTEngine,
	WebSocketTransport,
	BroadcastChannelTransport,
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_CONNECTED,
	MESSAGE_DISCONNECTED,
	MESSAGE_INITIAL_SYNC,
	encodeMessage,
	decodeMessage,
	encodeWithDocId,
	decodeWithDocId,
	decodeString,
	type CRDTDoc,
	type CRDTMap,
} from '@n8n/crdt';

declare const self: DedicatedWorkerGlobalScope;

interface DocumentState {
	doc: CRDTDoc;
	serverTransport: WebSocketTransport | null;
	broadcastTransport: BroadcastChannelTransport | null;
	awarenessBroadcastTransport: BroadcastChannelTransport | null;
	serverUrl: string;
	unsubscribeDoc: (() => void) | null;
	unsubscribeBroadcast: (() => void) | null;
	unsubscribeAwarenessBroadcast: (() => void) | null;
	/** Whether initial sync from server has been received */
	initialSyncReceived: boolean;
}

// Track documents and their state
const documents = new Map<string, DocumentState>();

// CRDT provider
const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

/**
 * Send a binary message to the main thread.
 */
function sendToMain(messageType: number, docId: string, payload?: Uint8Array): void {
	const message = encodeWithDocId(messageType, docId, payload);
	self.postMessage(message);
}

/**
 * Get or create a document state.
 */
function getOrCreateDocument(docId: string, serverUrl: string): DocumentState {
	let docState = documents.get(docId);

	if (!docState) {
		const doc = provider.createDoc(docId);

		docState = {
			doc,
			serverTransport: null,
			broadcastTransport: null,
			awarenessBroadcastTransport: null,
			serverUrl,
			unsubscribeDoc: null,
			unsubscribeBroadcast: null,
			unsubscribeAwarenessBroadcast: null,
			initialSyncReceived: false,
		};

		// Subscribe to document updates
		docState.unsubscribeDoc = doc.onUpdate((update, origin) => {
			// Only broadcast local changes
			if (origin !== 'local') return;

			const state = documents.get(docId);
			if (!state) return;

			// Send to main thread
			sendToMain(MESSAGE_SYNC, docId, update);

			// Broadcast to other tabs via BroadcastChannel
			if (state.broadcastTransport?.connected) {
				state.broadcastTransport.send(update);
			}

			// Send to server if connected (with message prefix)
			if (state.serverTransport?.connected) {
				state.serverTransport.send(encodeMessage(MESSAGE_SYNC, update));
			}
		});

		documents.set(docId, docState);
	}

	return docState;
}

/**
 * Set up BroadcastChannel for cross-tab sync.
 */
async function setupBroadcastChannel(docState: DocumentState, docId: string): Promise<void> {
	const channelName = `crdt-sync-${docId}`;
	const transport = new BroadcastChannelTransport(channelName);

	docState.broadcastTransport = transport;

	// Handle incoming updates from other tabs
	docState.unsubscribeBroadcast = transport.onReceive((data) => {
		// Apply to local doc
		docState.doc.applyUpdate(data);

		// Forward to main thread
		sendToMain(MESSAGE_SYNC, docId, data);
	});

	await transport.connect();
	console.log('[CRDT Worker] BroadcastChannel connected:', channelName);

	// Set up awareness BroadcastChannel (separate channel for awareness updates)
	const awarenessChannelName = `crdt-awareness-${docId}`;
	const awarenessTransport = new BroadcastChannelTransport(awarenessChannelName);

	docState.awarenessBroadcastTransport = awarenessTransport;

	// Handle incoming awareness updates from other tabs
	docState.unsubscribeAwarenessBroadcast = awarenessTransport.onReceive((data) => {
		// Apply to local awareness
		const awareness = docState.doc.getAwareness();
		awareness.applyUpdate(data);

		// Forward to main thread
		sendToMain(MESSAGE_AWARENESS, docId, data);
	});

	await awarenessTransport.connect();
	console.log('[CRDT Worker] Awareness BroadcastChannel connected:', awarenessChannelName);
}

/**
 * Connect to server for a document.
 */
async function connectToServer(docState: DocumentState, docId: string): Promise<void> {
	if (docState.serverTransport) return;

	const transport = new WebSocketTransport({
		url: docState.serverUrl,
		reconnect: true,
		maxReconnectAttempts: Infinity,
		reconnectDelay: 1000,
		maxReconnectDelay: 30000,
	});

	docState.serverTransport = transport;

	// Handle incoming server messages (with type prefix)
	transport.onReceive((data) => {
		const { messageType, payload } = decodeMessage(data);

		if (messageType === MESSAGE_SYNC) {
			// Apply sync update to local doc
			docState.doc.applyUpdate(payload);

			// Send to main thread
			sendToMain(MESSAGE_SYNC, docId, payload);

			// Broadcast to other tabs (they may not have server connection yet)
			if (docState.broadcastTransport?.connected) {
				docState.broadcastTransport.send(payload);
			}

			// On first message from server, notify main thread that initial sync is complete
			if (!docState.initialSyncReceived) {
				docState.initialSyncReceived = true;
				sendToMain(MESSAGE_INITIAL_SYNC, docId);
			}
		} else if (messageType === MESSAGE_AWARENESS) {
			// Apply awareness update
			const awareness = docState.doc.getAwareness();
			awareness.applyUpdate(payload);

			// Send to main thread
			sendToMain(MESSAGE_AWARENESS, docId, payload);

			// Broadcast to other tabs via awareness BroadcastChannel
			if (docState.awarenessBroadcastTransport?.connected) {
				docState.awarenessBroadcastTransport.send(payload);
			}
		} else {
			console.warn('[CRDT Worker] Unknown message type from server:', messageType);
		}
	});

	// Handle connection state changes
	transport.onConnectionChange((connected) => {
		sendToMain(connected ? MESSAGE_CONNECTED : MESSAGE_DISCONNECTED, docId);

		if (connected) {
			// Send initial state to server (with sync message prefix)
			const state = docState.doc.encodeState();
			transport.send(encodeMessage(MESSAGE_SYNC, state));

			// Send initial awareness state to server
			const awareness = docState.doc.getAwareness();
			const awarenessState = awareness.encodeState();
			if (awarenessState.length > 0) {
				transport.send(encodeMessage(MESSAGE_AWARENESS, awarenessState));
			}
			// Note: initial-sync is sent when we receive the first message from server
		}
	});

	transport.onError((error) => {
		console.error('[CRDT Worker] Server connection error:', error);
	});

	try {
		await transport.connect();
	} catch (error) {
		console.error('[CRDT Worker] Failed to connect to server:', error);
	}
}

/**
 * Simulate execution for nodes (writes to execution doc).
 * The execution doc is local-only and syncs between tabs but not to server.
 */
function simulateExecution(workflowDocId: string, nodeIds: string[]): void {
	const executionDocId = `${workflowDocId}:execution`;
	const executionDocState = documents.get(executionDocId);
	const workflowDocState = documents.get(workflowDocId);

	if (!executionDocState || !workflowDocState) {
		console.warn('[CRDT Worker] Cannot simulate execution - docs not found:', {
			workflowDocId,
			executionDocId,
		});
		return;
	}

	const executionsMap = executionDocState.doc.getMap<unknown>('executions');
	const nodesMap = workflowDocState.doc.getMap<unknown>('nodes');

	for (const nodeId of nodeIds) {
		const nodeMap = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
		const nodeName = nodeMap?.get('name') as string | undefined;

		// Create execution entry with 'running' status
		executionDocState.doc.transact(() => {
			const execMap = executionDocState.doc.createMap<unknown>();
			execMap.set('nodeId', nodeId);
			execMap.set('status', 'running');
			execMap.set('timestamp', Date.now());
			executionsMap.set(nodeId, execMap);
		});

		console.log('[CRDT Worker] Started execution for node:', nodeName ?? nodeId);

		// Simulate completion after 1-2 seconds
		const delay = 1000 + Math.random() * 1000;
		setTimeout(() => {
			const execMap = executionsMap.get(nodeId) as CRDTMap<unknown> | undefined;
			if (!execMap) return;

			const success = Math.random() > 0.3; // 70% success rate
			execMap.set('status', success ? 'success' : 'error');
			execMap.set(
				'output',
				success ? `Output from ${nodeName ?? nodeId}` : `Error in ${nodeName ?? nodeId}`,
			);

			console.log('[CRDT Worker] Execution completed:', {
				node: nodeName ?? nodeId,
				success,
			});
		}, delay);
	}
}

/**
 * Clear all executions from an execution doc.
 */
function clearExecutions(workflowDocId: string): void {
	const executionDocId = `${workflowDocId}:execution`;
	const executionDocState = documents.get(executionDocId);

	if (!executionDocState) {
		console.warn('[CRDT Worker] Cannot clear executions - doc not found:', executionDocId);
		return;
	}

	const executionsMap = executionDocState.doc.getMap<unknown>('executions');
	const keys = executionsMap.keys();

	for (const key of keys) {
		executionsMap.delete(key);
	}

	console.log('[CRDT Worker] Cleared all executions for:', workflowDocId);
}

/**
 * Handle a binary message from the main thread.
 */
function handleBinaryMessage(data: Uint8Array): void {
	const { messageType, docId, payload } = decodeWithDocId(data);

	switch (messageType) {
		case MESSAGE_SUBSCRIBE: {
			const serverUrl = decodeString(payload);

			const docState = getOrCreateDocument(docId, serverUrl);

			// Set up BroadcastChannel for cross-tab sync
			void setupBroadcastChannel(docState, docId);

			// Send current document state to main thread (if not empty)
			const state = docState.doc.encodeState();
			if (state.length > 0) {
				sendToMain(MESSAGE_SYNC, docId, state);
			}

			// Send current awareness state to main thread
			const awareness = docState.doc.getAwareness();
			const awarenessState = awareness.encodeState();
			if (awarenessState.length > 0) {
				sendToMain(MESSAGE_AWARENESS, docId, awarenessState);
			}

			// For local-only docs (no serverUrl), mark as ready immediately
			if (!serverUrl) {
				sendToMain(MESSAGE_INITIAL_SYNC, docId);
				console.log('[CRDT Worker] Subscribed to local-only document:', docId);
				break;
			}

			// Connect to server
			void connectToServer(docState, docId);

			console.log('[CRDT Worker] Subscribed to document:', docId);
			break;
		}

		case MESSAGE_UNSUBSCRIBE: {
			const docState = documents.get(docId);

			if (docState) {
				docState.serverTransport?.disconnect();
				docState.broadcastTransport?.disconnect();
				docState.awarenessBroadcastTransport?.disconnect();
				docState.unsubscribeDoc?.();
				docState.unsubscribeBroadcast?.();
				docState.unsubscribeAwarenessBroadcast?.();
				docState.doc.destroy();
				documents.delete(docId);
			}

			console.log('[CRDT Worker] Unsubscribed from document:', docId);
			break;
		}

		case MESSAGE_SYNC: {
			const docState = documents.get(docId);
			if (!docState) break;

			// Apply update to local doc
			docState.doc.applyUpdate(payload);

			// Broadcast to other tabs via BroadcastChannel
			if (docState.broadcastTransport?.connected) {
				docState.broadcastTransport.send(payload);
			}

			// Send to server if connected (with message prefix)
			if (docState.serverTransport?.connected) {
				docState.serverTransport.send(encodeMessage(MESSAGE_SYNC, payload));
			}

			console.log('[CRDT Worker] Applied update from main:', {
				docId,
				size: payload.length,
			});
			break;
		}

		case MESSAGE_AWARENESS: {
			const docState = documents.get(docId);
			if (!docState) break;

			// Apply awareness update to local doc
			const awareness = docState.doc.getAwareness();
			awareness.applyUpdate(payload);

			// Broadcast to other tabs via BroadcastChannel
			if (docState.awarenessBroadcastTransport?.connected) {
				docState.awarenessBroadcastTransport.send(payload);
			}

			// Send to server if connected (with message prefix)
			if (docState.serverTransport?.connected) {
				docState.serverTransport.send(encodeMessage(MESSAGE_AWARENESS, payload));
			}

			console.log('[CRDT Worker] Applied awareness update from main:', {
				docId,
				size: payload.length,
			});
			break;
		}
	}
}

/**
 * Handle messages from main thread.
 */
function handleMessage(event: MessageEvent): void {
	const data = event.data;

	// Handle binary messages
	if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
		const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
		handleBinaryMessage(bytes);
		return;
	}

	// Legacy JSON message support for simulate-execution and clear-executions
	const message = data as {
		type: string;
		workflowDocId?: string;
		nodeIds?: string[];
	};

	switch (message.type) {
		case 'simulate-execution': {
			if (!message.workflowDocId || !message.nodeIds) break;
			simulateExecution(message.workflowDocId, message.nodeIds);
			break;
		}

		case 'clear-executions': {
			if (!message.workflowDocId) break;
			clearExecutions(message.workflowDocId);
			break;
		}
	}
}

// Handle messages from main thread
self.onmessage = handleMessage;

console.log('[CRDT Worker] Started (Safari fallback mode)');
