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
 * Message Protocol (same as SharedWorker):
 * - From Tab: { type: 'subscribe', docId: string, serverUrl: string }
 * - From Tab: { type: 'unsubscribe', docId: string }
 * - From Tab: { type: 'sync', docId: string, data: Uint8Array }
 * - From Tab: { type: 'simulate-execution', workflowDocId: string, nodeIds: string[] }
 * - From Tab: { type: 'clear-executions', workflowDocId: string }
 * - To Tab: { type: 'sync', docId: string, data: Uint8Array }
 * - To Tab: { type: 'connected', docId: string }
 * - To Tab: { type: 'disconnected', docId: string }
 * - To Tab: { type: 'initial-sync', docId: string }
 */

/// <reference lib="webworker" />

import {
	createCRDTProvider,
	CRDTEngine,
	WebSocketTransport,
	BroadcastChannelTransport,
	type CRDTDoc,
	type CRDTMap,
} from '@n8n/crdt/browser';

declare const self: DedicatedWorkerGlobalScope;

interface DocumentState {
	doc: CRDTDoc;
	serverTransport: WebSocketTransport | null;
	broadcastTransport: BroadcastChannelTransport | null;
	serverUrl: string;
	unsubscribeDoc: (() => void) | null;
	unsubscribeBroadcast: (() => void) | null;
}

// Track documents and their state
const documents = new Map<string, DocumentState>();

// CRDT provider
const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

/**
 * Send a message to the main thread.
 */
function sendToMain(message: unknown, transfer?: Transferable[]): void {
	self.postMessage(message, { transfer });
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
			serverUrl,
			unsubscribeDoc: null,
			unsubscribeBroadcast: null,
		};

		// Subscribe to document updates
		docState.unsubscribeDoc = doc.onUpdate((update, origin) => {
			// Only broadcast local changes
			if (origin !== 'local') return;

			const state = documents.get(docId);
			if (!state) return;

			// Send to main thread (no transfer - structured clone copies safely)
			sendToMain({ type: 'sync', docId, data: update });

			// Broadcast to other tabs via BroadcastChannel
			if (state.broadcastTransport?.connected) {
				state.broadcastTransport.send(update);
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

		// Forward to main thread (no transfer - structured clone copies safely)
		sendToMain({ type: 'sync', docId, data });
	});

	await transport.connect();
	console.log('[CRDT Worker] BroadcastChannel connected:', channelName);
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

		// Send to main thread (no transfer - structured clone copies safely)
		sendToMain({ type: 'sync', docId, data });

		// Broadcast to other tabs (they may not have server connection yet)
		if (docState.broadcastTransport?.connected) {
			docState.broadcastTransport.send(data);
		}
	});

	// Handle connection state changes
	transport.onConnectionChange((connected) => {
		const messageType = connected ? 'connected' : 'disconnected';
		sendToMain({ type: messageType, docId });

		if (connected) {
			// Send initial state to server
			const state = docState.doc.encodeState();
			transport.send(state);

			// Notify main thread that initial sync is complete
			sendToMain({ type: 'initial-sync', docId });
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
 * Handle messages from main thread.
 */
function handleMessage(event: MessageEvent): void {
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

			const docState = getOrCreateDocument(docId, serverUrl);

			// Set up BroadcastChannel for cross-tab sync
			void setupBroadcastChannel(docState, docId);

			// Send current document state to main thread (if not empty)
			const state = docState.doc.encodeState();
			if (state.length > 0) {
				sendToMain({ type: 'sync', docId, data: state });
			}

			// For local-only docs (no serverUrl), mark as ready immediately
			if (!serverUrl) {
				sendToMain({ type: 'initial-sync', docId });
				console.log('[CRDT Worker] Subscribed to local-only document:', docId);
				break;
			}

			// Connect to server
			void connectToServer(docState, docId);

			console.log('[CRDT Worker] Subscribed to document:', docId);
			break;
		}

		case 'unsubscribe': {
			if (!message.docId) break;

			const { docId } = message;
			const docState = documents.get(docId);

			if (docState) {
				docState.serverTransport?.disconnect();
				docState.broadcastTransport?.disconnect();
				docState.unsubscribeDoc?.();
				docState.unsubscribeBroadcast?.();
				docState.doc.destroy();
				documents.delete(docId);
			}

			console.log('[CRDT Worker] Unsubscribed from document:', docId);
			break;
		}

		case 'sync': {
			if (!message.docId || !message.data) break;

			const { docId, data } = message;
			const docState = documents.get(docId);
			if (!docState) break;

			// Apply update to local doc
			docState.doc.applyUpdate(data);

			// Manually broadcast (applyUpdate doesn't trigger onUpdate for local origin)
			// Broadcast to other tabs via BroadcastChannel
			if (docState.broadcastTransport?.connected) {
				docState.broadcastTransport.send(data);
			}

			// Send to server if connected
			if (docState.serverTransport?.connected) {
				docState.serverTransport.send(data);
			}

			console.log('[CRDT Worker] Applied update from main:', {
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
}

// Handle messages from main thread
self.onmessage = handleMessage;

console.log('[CRDT Worker] Started (Safari fallback mode)');
