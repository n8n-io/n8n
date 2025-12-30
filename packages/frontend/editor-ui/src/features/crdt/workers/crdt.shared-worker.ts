/**
 * CRDT SharedWorker - Manages cross-tab synchronization and server connection.
 *
 * Architecture:
 * - Each browser tab connects to this SharedWorker via MessagePort
 * - The SharedWorker maintains a single connection to the server per document
 * - Local changes from any tab are broadcast to all other tabs AND to the server
 * - Server updates are broadcast to all connected tabs
 *
 * Message Protocol:
 * - From Tab: { type: 'subscribe', docId: string } - Subscribe to a document
 * - From Tab: { type: 'unsubscribe', docId: string } - Unsubscribe from a document
 * - From Tab: { type: 'sync', docId: string, data: Uint8Array } - Send update
 * - From Tab: { type: 'simulate-execution', workflowDocId: string, nodeIds: string[] } - Simulate execution
 * - From Tab: { type: 'clear-executions', workflowDocId: string } - Clear all executions
 * - To Tab: { type: 'sync', docId: string, data: Uint8Array } - Receive update
 * - To Tab: { type: 'connected', docId: string } - Server connection established
 * - To Tab: { type: 'disconnected', docId: string } - Server connection lost
 * - To Tab: { type: 'initial-sync', docId: string } - Initial sync complete
 */

/// <reference lib="webworker" />

import {
	createCRDTProvider,
	CRDTEngine,
	WebSocketTransport,
	type CRDTDoc,
	type CRDTMap,
} from '@n8n/crdt/browser';

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
 * Broadcast a message to all tabs subscribed to a document.
 */
function broadcastToTabs(docId: string, message: unknown): void {
	const docState = documents.get(docId);
	if (!docState) return;

	for (const tab of docState.tabs) {
		tab.port.postMessage(message);
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
			for (const tab of state.tabs) {
				tab.port.postMessage({ type: 'sync', docId, data: update });
			}

			// Send to server if connected
			if (state.serverTransport?.connected) {
				state.serverTransport.send(update);
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

	// Handle incoming server updates
	transport.onReceive((data) => {
		// Apply to local doc
		docState.doc.applyUpdate(data);

		// Broadcast to all tabs
		for (const tab of docState.tabs) {
			tab.port.postMessage({ type: 'sync', docId, data });
		}

		// On first message from server, notify tabs that initial sync is complete
		if (!docState.initialSyncReceived) {
			docState.initialSyncReceived = true;
			broadcastToTabs(docId, { type: 'initial-sync', docId });
		}
	});

	// Handle connection state changes
	docState.unsubscribeTransport = transport.onConnectionChange((connected) => {
		const messageType = connected ? 'connected' : 'disconnected';
		broadcastToTabs(docId, { type: messageType, docId });

		if (connected) {
			// Send initial state to server
			const state = docState.doc.encodeState();
			transport.send(state);
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
 * Handle a new tab connection.
 */
function handleTabConnect(port: MessagePort): void {
	const tabConnection: TabConnection = {
		port,
		docIds: new Set(),
	};

	tabs.set(port, tabConnection);

	port.onmessage = (event) => {
		const message = event.data as {
			type: string;
			docId?: string;
			serverUrl?: string;
			data?: Uint8Array;
			workflowDocId?: string;
			nodeIds?: string[];
		};

		switch (message.type) {
			case 'subscribe': {
				if (!message.docId) break;

				const { docId, serverUrl = '' } = message;
				tabConnection.docIds.add(docId);

				const docState = getOrCreateDocument(docId, serverUrl);
				docState.tabs.add(tabConnection);

				// Send current document state to the new tab (if not empty)
				const state = docState.doc.encodeState();
				if (state.length > 0) {
					port.postMessage({ type: 'sync', docId, data: state });
				}

				// For local-only docs (no serverUrl), mark as ready immediately
				if (!serverUrl) {
					port.postMessage({ type: 'initial-sync', docId });
					console.log('[CRDT SharedWorker] Tab subscribed to local-only document:', docId);
					break;
				}

				// Connect to server if this is the first tab for this document
				if (docState.tabs.size === 1 && !docState.serverTransport) {
					void connectToServer(docState, docId);
				} else if (docState.serverTransport?.connected) {
					// Already connected, notify tab
					port.postMessage({ type: 'connected', docId });
					// Only send initial-sync if we've already received data from server
					if (docState.initialSyncReceived) {
						port.postMessage({ type: 'initial-sync', docId });
					}
				}

				console.log('[CRDT SharedWorker] Tab subscribed to document:', docId);
				break;
			}

			case 'unsubscribe': {
				if (!message.docId) break;

				const { docId } = message;
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
						console.log('[CRDT SharedWorker] Document cleaned up:', docId);
					}
				}

				console.log('[CRDT SharedWorker] Tab unsubscribed from document:', docId);
				break;
			}

			case 'sync': {
				if (!message.docId || !message.data) break;

				const { docId, data } = message;
				const docState = documents.get(docId);
				if (!docState) break;

				// Apply update to local doc
				docState.doc.applyUpdate(data);

				// Manually broadcast to other tabs (applyUpdate doesn't trigger onUpdate for local origin)
				for (const tab of docState.tabs) {
					if (tab.port !== port) {
						tab.port.postMessage({ type: 'sync', docId, data });
					}
				}

				// Send to server if connected
				if (docState.serverTransport?.connected) {
					docState.serverTransport.send(data);
				}

				console.log('[CRDT SharedWorker] Applied update from tab:', {
					docId,
					size: data.length,
				});
				break;
			}

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
	};

	// Start receiving messages
	port.start();

	console.log('[CRDT SharedWorker] Tab connected');
}

// Handle new connections
self.onconnect = (event: MessageEvent) => {
	const port = event.ports[0];
	handleTabConnect(port);
};

console.log('[CRDT SharedWorker] Started');
