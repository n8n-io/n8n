/**
 * CRDT SharedWorker - Manages cross-tab synchronization and server connection.
 *
 * Architecture:
 * - Each browser tab connects to this SharedWorker via MessagePort
 * - The SharedWorker maintains a single connection to the server per document
 * - Local changes from any tab are broadcast to all other tabs AND to the server
 * - Server updates are broadcast to all connected tabs
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

declare const self: SharedWorkerGlobalScope;

interface TabConnection {
	port: MessagePort;
	docIds: Set<string>;
}

interface DocumentState {
	doc: CRDTDoc;
	serverTransport: WebSocketTransport | null;
	tabs: Set<TabConnection>;
	/** Server URL. Empty string for local-only documents (no server sync). */
	serverUrl: string;
	unsubscribeDoc: (() => void) | null;
	unsubscribeTransport: (() => void) | null;
	/** Whether initial sync from server has been received */
	initialSyncReceived: boolean;
}

// Track all connected tabs
const tabs = new Map<MessagePort, TabConnection>();

// Track documents and their state
const documents = new Map<string, DocumentState>();

// CRDT provider
const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

/**
 * Send a binary message to a tab.
 */
function sendToTab(
	port: MessagePort,
	messageType: number,
	docId: string,
	payload?: Uint8Array,
): void {
	const message = encodeWithDocId(messageType, docId, payload);
	port.postMessage(message);
}

/**
 * Broadcast a binary message to all tabs subscribed to a document.
 */
function broadcastToTabs(
	docId: string,
	messageType: number,
	payload?: Uint8Array,
	excludePort?: MessagePort,
): void {
	const docState = documents.get(docId);
	if (!docState) return;

	const message = encodeWithDocId(messageType, docId, payload);
	for (const tab of docState.tabs) {
		if (tab.port !== excludePort) {
			tab.port.postMessage(message);
		}
	}
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
			tabs: new Set(),
			serverUrl,
			unsubscribeDoc: null,
			unsubscribeTransport: null,
			initialSyncReceived: false,
		};

		// Subscribe to document updates and broadcast to all tabs + server
		docState.unsubscribeDoc = doc.onUpdate((update, origin) => {
			// Only broadcast local changes (not updates we received from elsewhere)
			if (origin !== 'local') return;

			const state = documents.get(docId);
			if (!state) return;

			// Broadcast to all tabs
			broadcastToTabs(docId, MESSAGE_SYNC, update);

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

			// Broadcast to all tabs
			broadcastToTabs(docId, MESSAGE_SYNC, payload);

			// On first message from server, notify tabs that initial sync is complete
			if (!docState.initialSyncReceived) {
				docState.initialSyncReceived = true;
				broadcastToTabs(docId, MESSAGE_INITIAL_SYNC);
			}
		} else if (messageType === MESSAGE_AWARENESS) {
			// Apply awareness update
			const awareness = docState.doc.getAwareness();
			awareness.applyUpdate(payload);

			// Broadcast to all tabs
			broadcastToTabs(docId, MESSAGE_AWARENESS, payload);
		} else {
			console.warn('[CRDT SharedWorker] Unknown message type from server:', messageType);
		}
	});

	// Handle connection state changes
	docState.unsubscribeTransport = transport.onConnectionChange((connected) => {
		broadcastToTabs(docId, connected ? MESSAGE_CONNECTED : MESSAGE_DISCONNECTED);

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
			// Note: initial-sync is broadcast when we receive the first message from server
		}
	});

	transport.onError((error) => {
		console.error('[CRDT SharedWorker] Server connection error:', error);
	});

	try {
		await transport.connect();
	} catch (error) {
		console.error('[CRDT SharedWorker] Failed to connect to server:', error);
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
		console.warn('[CRDT SharedWorker] Cannot simulate execution - docs not found:', {
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

		console.log('[CRDT SharedWorker] Started execution for node:', nodeName ?? nodeId);

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

			console.log('[CRDT SharedWorker] Execution completed:', {
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
		console.warn('[CRDT SharedWorker] Cannot clear executions - doc not found:', executionDocId);
		return;
	}

	const executionsMap = executionDocState.doc.getMap<unknown>('executions');
	const keys = executionsMap.keys();

	for (const key of keys) {
		executionsMap.delete(key);
	}

	console.log('[CRDT SharedWorker] Cleared all executions for:', workflowDocId);
}

/**
 * Handle a binary message from a tab.
 */
function handleBinaryMessage(
	data: Uint8Array,
	port: MessagePort,
	tabConnection: TabConnection,
): void {
	const { messageType, docId, payload } = decodeWithDocId(data);

	switch (messageType) {
		case MESSAGE_SUBSCRIBE: {
			const serverUrl = decodeString(payload);
			tabConnection.docIds.add(docId);

			const docState = getOrCreateDocument(docId, serverUrl);
			docState.tabs.add(tabConnection);

			// Send current document state to the new tab (if not empty)
			const state = docState.doc.encodeState();
			if (state.length > 0) {
				sendToTab(port, MESSAGE_SYNC, docId, state);
			}

			// Send current awareness state to the new tab
			const awareness = docState.doc.getAwareness();
			const awarenessState = awareness.encodeState();
			if (awarenessState.length > 0) {
				sendToTab(port, MESSAGE_AWARENESS, docId, awarenessState);
			}

			// For local-only docs (no serverUrl), mark as ready immediately
			if (!serverUrl) {
				sendToTab(port, MESSAGE_INITIAL_SYNC, docId);
				break;
			}

			// Connect to server if this is the first tab for this document
			if (docState.tabs.size === 1 && !docState.serverTransport) {
				void connectToServer(docState, docId);
			} else if (docState.serverTransport?.connected) {
				// Already connected, notify tab
				sendToTab(port, MESSAGE_CONNECTED, docId);
				// Only send initial-sync if we've already received data from server
				if (docState.initialSyncReceived) {
					sendToTab(port, MESSAGE_INITIAL_SYNC, docId);
				}
			}

			break;
		}

		case MESSAGE_UNSUBSCRIBE: {
			tabConnection.docIds.delete(docId);

			const docState = documents.get(docId);
			if (docState) {
				docState.tabs.delete(tabConnection);

				// If no more tabs are subscribed, clean up
				if (docState.tabs.size === 0) {
					docState.serverTransport?.disconnect();
					docState.unsubscribeDoc?.();
					docState.unsubscribeTransport?.();
					docState.doc.destroy();
					documents.delete(docId);
				}
			}

			break;
		}

		case MESSAGE_SYNC: {
			const docState = documents.get(docId);
			if (!docState) break;

			// Apply update to local doc
			docState.doc.applyUpdate(payload);

			// Broadcast to other tabs (exclude sender)
			broadcastToTabs(docId, MESSAGE_SYNC, payload, port);

			// Send to server if connected (with message prefix)
			if (docState.serverTransport?.connected) {
				docState.serverTransport.send(encodeMessage(MESSAGE_SYNC, payload));
			}

			break;
		}

		case MESSAGE_AWARENESS: {
			const docState = documents.get(docId);
			if (!docState) break;

			// Apply awareness update to local doc
			const awareness = docState.doc.getAwareness();
			awareness.applyUpdate(payload);

			// Broadcast to other tabs (exclude sender)
			broadcastToTabs(docId, MESSAGE_AWARENESS, payload, port);

			// Send to server if connected (with message prefix)
			if (docState.serverTransport?.connected) {
				docState.serverTransport.send(encodeMessage(MESSAGE_AWARENESS, payload));
			}

			break;
		}
	}
}

/**
 * Handle cleanup when a tab disconnects (port closes).
 */
function handleTabDisconnect(port: MessagePort, tabConnection: TabConnection): void {
	// Remove tab from all documents it was subscribed to
	for (const docId of tabConnection.docIds) {
		const docState = documents.get(docId);
		if (docState) {
			docState.tabs.delete(tabConnection);

			// If no more tabs are subscribed, clean up
			if (docState.tabs.size === 0) {
				docState.serverTransport?.disconnect();
				docState.unsubscribeDoc?.();
				docState.unsubscribeTransport?.();
				docState.doc.destroy();
				documents.delete(docId);
			}
		}
	}

	tabs.delete(port);
}

/**
 * Handle a new tab connection.
 */
function handleTabConnect(port: MessagePort): void {
	const tabConnection: TabConnection = {
		port,
		docIds: new Set(),
	};

	tabs.set(port, tabConnection);

	port.onmessage = (event) => {
		const data = event.data;

		// Handle binary messages
		if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
			const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
			handleBinaryMessage(bytes, port, tabConnection);
			return;
		}

		// Legacy JSON message support for simulate-execution and clear-executions
		// These don't need to go through the transport abstraction
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
	};

	port.onmessageerror = (event) => {
		console.error('[CRDT SharedWorker] Message error:', event);
		handleTabDisconnect(port, tabConnection);
	};

	// Start receiving messages
	port.start();
}

// Handle new connections
self.onconnect = (event: MessageEvent) => {
	const port = event.ports[0];
	handleTabConnect(port);
};

console.log('[CRDT SharedWorker] Started');
