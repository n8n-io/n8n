/**
 * CRDT Operations for Coordinator SharedWorker
 *
 * The Coordinator supports two modes per document:
 *
 * **Worker Mode** (serverUrl is empty or REST URL):
 * - Holds CRDT documents in memory (source of truth)
 * - Computes handles on parameter changes
 * - Broadcasts updates to all subscribed tabs
 * - Persists to server via REST API
 *
 * **Server Mode** (serverUrl is WebSocket URL):
 * - Proxies CRDT messages to/from WebSocket server
 * - Server holds documents and computes handles
 * - Coordinator maintains local proxy doc for awareness
 * - Server handles persistence
 */

import {
	CRDTEngine,
	createCRDTProvider,
	WebSocketTransport,
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_INITIAL_SYNC,
	MESSAGE_CONNECTED,
	MESSAGE_DISCONNECTED,
	decodeWithDocId,
	decodeString,
	decodeMessage,
	encodeMessage,
	seedValueDeep,
	setNestedValue,
} from '@n8n/crdt';
import {
	Workflow,
	WorkflowRoom,
	computeAllNodeHandles,
	syncWorkflowWithDoc,
	setupHandleRecomputation,
	setupExpressionRenaming,
	seedWorkflowDoc,
	crdtNodeMapToINode,
	type CRDTMapLike,
	type IConnections,
	type INode,
	type INodeTypeDescription,
	type INodeTypes,
	type IPinData,
	type SeedValueDeepFn,
	type SetNestedValueFn,
	type NodeConnectionType,
} from 'n8n-workflow';

import type { CoordinatorState, CRDTDocumentState, CRDTExecutionDocumentState } from '../types';
import { getOrCreateExecutionDoc } from './executionPush';
import { resolveAllNodeExpressions, resolveNodeExpressions } from './resolveExpressions';

// =============================================================================
// CRDT Provider Initialization
// =============================================================================

/**
 * Ensure the CRDT provider is initialized
 */
export function ensureCRDTProvider(state: CoordinatorState): void {
	if (!state.crdtProvider) {
		state.crdtProvider = createCRDTProvider({ engine: CRDTEngine.yjs });
	}
}

// =============================================================================
// Port Management
// =============================================================================

/**
 * Initialize CRDT subscription for a tab with the provided port.
 * The port is created by the tab during registration and transferred to the coordinator.
 * This ensures one port per tab, managed by the browser.
 *
 * @param state - Coordinator state
 * @param tabId - The tab ID
 * @param crdtPort - The CRDT port transferred from the tab
 */
export function initializeCrdtSubscription(
	state: CoordinatorState,
	tabId: string,
	crdtPort: MessagePort,
): void {
	// Set up message handler on the port
	crdtPort.onmessage = (event: MessageEvent<ArrayBuffer>) => {
		void handleCrdtMessage(state, tabId, event.data);
	};
	crdtPort.start();

	// Initialize subscription
	state.crdtSubscriptions.set(tabId, {
		docIds: new Set(),
		crdtPort,
		clientIdsByDoc: new Map(),
	});
}

/**
 * Clean up CRDT subscription when tab disconnects.
 * Removes awareness states for any clientIds that were associated with this tab,
 * which handles page refresh and unexpected disconnects.
 */
export function cleanupCrdtSubscription(state: CoordinatorState, tabId: string): void {
	const subscription = state.crdtSubscriptions.get(tabId);
	if (!subscription) {
		return;
	}

	// Remove awareness states for this tab's clientIds (handles page refresh)
	subscription.clientIdsByDoc.forEach((clientIds: Set<number>, docId: string) => {
		if (clientIds.size > 0) {
			const docState = state.crdtDocuments.get(docId);
			if (docState) {
				const awareness = docState.doc.getAwareness();
				const clientIdsArray = Array.from(clientIds);

				// Remove the states from awareness (generates removal update)
				awareness.removeStates(clientIdsArray);

				// Encode the removal update and broadcast to remaining tabs
				const removalUpdate = awareness.encodeState(clientIdsArray);
				broadcastToSubscribedTabs(state, docId, MESSAGE_AWARENESS, removalUpdate, tabId);

				// Send to server if in server mode
				if (docState.serverMode && docState.serverTransport?.connected) {
					docState.serverTransport.send(encodeMessage(MESSAGE_AWARENESS, removalUpdate));
				}
			}
		}
	});

	// Unsubscribe from all documents
	for (const docId of subscription.docIds) {
		unsubscribeFromDocument(state, tabId, docId);
	}

	// Close the port
	subscription.crdtPort.close();
	state.crdtSubscriptions.delete(tabId);
}

// =============================================================================
// Message Handling
// =============================================================================

/**
 * Handle incoming CRDT binary message from a tab
 */
async function handleCrdtMessage(
	state: CoordinatorState,
	tabId: string,
	data: ArrayBuffer,
): Promise<void> {
	const rawData = new Uint8Array(data);
	const { messageType, docId, payload } = decodeWithDocId(rawData);

	switch (messageType) {
		case MESSAGE_SUBSCRIBE: {
			// payload contains the server URL (for hybrid mode, currently unused in worker mode)
			const baseUrl = decodeString(payload);
			await handleSubscribe(state, tabId, docId, baseUrl);
			break;
		}
		case MESSAGE_UNSUBSCRIBE:
			handleUnsubscribe(state, tabId, docId);
			break;
		case MESSAGE_SYNC:
			handleSyncMessage(state, tabId, docId, payload);
			break;
		case MESSAGE_AWARENESS:
			handleAwarenessMessage(state, tabId, docId, payload);
			break;
	}
}

// =============================================================================
// Mode Detection
// =============================================================================

/**
 * Detect if a URL indicates server mode (WebSocket) vs worker mode (REST).
 * Server mode uses WebSocket for real-time sync with the server.
 * Worker mode uses REST API for persistence, coordinator holds the document.
 */
function isServerMode(serverUrl: string): boolean {
	return serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://');
}

/**
 * Extract nodes array from CRDT document (for fetching node types).
 * Used to determine which node types to fetch before creating Workflow instance.
 */
function getNodesFromDoc(doc: CRDTDocumentState['doc']): INode[] {
	const nodesMap = doc.getMap('nodes');
	const nodes: INode[] = [];
	for (const [id, value] of nodesMap.entries()) {
		if (value && typeof value === 'object') {
			const node = crdtNodeMapToINode(value as CRDTMapLike<unknown>, id);
			if (node) nodes.push(node);
		}
	}
	return nodes;
}

/**
 * Extract connections from CRDT document.
 * Converts flat edge format (Vue Flow) to nested IConnections format (Workflow).
 */
function getConnectionsFromDoc(doc: CRDTDocumentState['doc']): IConnections {
	const nodesMap = doc.getMap('nodes');
	const edgesMap = doc.getMap('edges');

	// Build node ID -> name lookup
	const nodeNameById = new Map<string, string>();
	for (const [id, value] of nodesMap.entries()) {
		if (value && typeof value === 'object') {
			const node = crdtNodeMapToINode(value as CRDTMapLike<unknown>, id);
			if (node?.name) {
				nodeNameById.set(id, node.name);
			}
		}
	}

	// Convert edges to IConnections
	const connections: IConnections = {};
	for (const [, edgeValue] of edgesMap.entries()) {
		if (!edgeValue || typeof edgeValue !== 'object') continue;

		// Handle CRDTMap or plain object
		const edge =
			'toJSON' in edgeValue
				? (
						edgeValue as {
							toJSON(): {
								source: string;
								target: string;
								sourceHandle: string;
								targetHandle: string;
							};
						}
					).toJSON()
				: (edgeValue as {
						source: string;
						target: string;
						sourceHandle: string;
						targetHandle: string;
					});

		const sourceName = nodeNameById.get(edge.source);
		const targetName = nodeNameById.get(edge.target);
		if (!sourceName || !targetName) continue;

		// Parse handle format: "outputs/main/0" or "inputs/main/0"
		const sourceHandle = edge.sourceHandle.split('/');
		const targetHandle = edge.targetHandle.split('/');
		const sourceType = (sourceHandle[1] ?? 'main') as keyof IConnections[string];
		const sourceIndex = parseInt(sourceHandle[2] ?? '0', 10);
		const targetType = (targetHandle[1] ?? 'main') as NodeConnectionType;
		const targetIndex = parseInt(targetHandle[2] ?? '0', 10);

		// Initialize nested structure
		connections[sourceName] ??= {};
		connections[sourceName][sourceType] ??= [];

		// Ensure array has enough slots
		while (connections[sourceName][sourceType].length <= sourceIndex) {
			connections[sourceName][sourceType].push(null);
		}

		connections[sourceName][sourceType][sourceIndex] ??= [];
		connections[sourceName][sourceType][sourceIndex]!.push({
			node: targetName,
			type: targetType,
			index: targetIndex,
		});
	}

	return connections;
}

/**
 * Extract workflow metadata from CRDT document.
 */
function getMetaFromDoc(
	doc: CRDTDocumentState['doc'],
	defaultName: string,
): { name: string; settings?: Record<string, unknown> } {
	const metaMap = doc.getMap('meta');
	const name = (metaMap.get('name') as string | undefined) ?? defaultName;
	const settings = metaMap.get('settings') as Record<string, unknown> | undefined;
	return { name, settings };
}

// =============================================================================
// Subscription Handling
// =============================================================================

/**
 * Handle subscription to execution documents.
 * Unlike workflow documents, execution docs don't need seeding from REST -
 * they're created on-demand when execution starts via push events.
 */
function handleExecutionDocSubscribe(state: CoordinatorState, tabId: string, docId: string): void {
	const subscription = state.crdtSubscriptions.get(tabId);
	if (!subscription) {
		return;
	}

	// Add doc to subscription (enables future broadcasts)
	subscription.docIds.add(docId);

	// Get existing execution doc if it exists
	const docState = state.crdtExecutionDocuments.get(docId);
	if (docState) {
		// Send current state to newly subscribed tab
		const currentState = docState.doc.encodeState();
		sendToTab(subscription.crdtPort, MESSAGE_SYNC, docId, currentState);
		sendToTab(subscription.crdtPort, MESSAGE_INITIAL_SYNC, docId, new Uint8Array(0));
	} else {
		// Doc doesn't exist yet - will be created when execution starts
		// Just send empty initial sync so tab knows subscription is complete
		sendToTab(subscription.crdtPort, MESSAGE_INITIAL_SYNC, docId, new Uint8Array(0));
	}
}

/**
 * Handle SUBSCRIBE message - branch based on server mode vs worker mode.
 *
 * Worker Mode: Seed from REST API, hold document locally, compute handles.
 * Server Mode: Connect to WebSocket server, proxy messages, server holds document.
 */
async function handleSubscribe(
	state: CoordinatorState,
	tabId: string,
	docId: string,
	serverUrl: string,
): Promise<void> {
	// Handle execution documents separately (they don't need REST seeding)
	if (docId.startsWith('exec-')) {
		handleExecutionDocSubscribe(state, tabId, docId);
		return;
	}

	ensureCRDTProvider(state);

	const subscription = state.crdtSubscriptions.get(tabId);
	if (!subscription) {
		return;
	}

	// Add doc to subscription
	subscription.docIds.add(docId);

	// Determine mode based on URL
	const serverMode = isServerMode(serverUrl);

	// Get or create document state
	let docState = state.crdtDocuments.get(docId);
	if (!docState) {
		const doc = state.crdtProvider!.createDoc(docId);
		docState = {
			doc,
			handleObserverUnsub: null,
			seeded: false,
			room: null,
			// Server mode fields
			serverMode,
			serverTransport: null,
			serverTransportUnsub: null,
		};
		state.crdtDocuments.set(docId, docState);
	}

	if (docState.serverMode) {
		// =================================================================
		// SERVER MODE: Connect to WebSocket server, proxy messages
		// =================================================================
		if (!docState.serverTransport) {
			await connectToServer(state, docId, docState, serverUrl);
		} else {
			// Server transport already exists - this is a new subscriber to an existing connection
			// Send current document state to the new tab (similar to worker mode)
			const currentState = docState.doc.encodeState();
			if (currentState.length > 0) {
				sendToTab(subscription.crdtPort, MESSAGE_SYNC, docId, currentState);
			}

			// Send awareness state
			const awareness = docState.doc.getAwareness();
			const awarenessState = awareness.encodeState();
			if (awarenessState.length > 0) {
				sendToTab(subscription.crdtPort, MESSAGE_AWARENESS, docId, awarenessState);
			}

			// Signal initial sync complete
			sendToTab(subscription.crdtPort, MESSAGE_INITIAL_SYNC, docId, new Uint8Array(0));
		}
	} else {
		// =================================================================
		// WORKER MODE: Seed from REST, hold locally (existing behavior)
		// =================================================================
		// Seed the document if not already seeded
		if (!docState.seeded) {
			await seedDocument(state, docId, docState);
		}

		// Send initial state to the tab
		const initialState = docState.doc.encodeState();
		sendToTab(subscription.crdtPort, MESSAGE_SYNC, docId, initialState);

		// Send initial awareness state
		const awareness = docState.doc.getAwareness();
		const awarenessState = awareness.encodeState();
		if (awarenessState.length > 0) {
			sendToTab(subscription.crdtPort, MESSAGE_AWARENESS, docId, awarenessState);
		}

		// Send initial sync complete signal
		sendToTab(subscription.crdtPort, MESSAGE_INITIAL_SYNC, docId, new Uint8Array(0));
	}
}

// =============================================================================
// Server Mode: WebSocket Connection
// =============================================================================

/**
 * Connect to WebSocket server for server mode.
 * The server holds the document and computes handles.
 * We proxy messages between tabs and server.
 */
async function connectToServer(
	state: CoordinatorState,
	docId: string,
	docState: CRDTDocumentState,
	serverUrl: string,
): Promise<void> {
	const transport = new WebSocketTransport({
		url: serverUrl,
		reconnect: true,
	});

	let initialSyncSent = false;
	let workflowInitialized = false;

	// Handle messages FROM server
	const unsubReceive = transport.onReceive(async (data: Uint8Array) => {
		const { messageType, payload } = decodeMessage(data);

		if (messageType === MESSAGE_SYNC) {
			// Apply to local proxy doc (for awareness state)
			docState.doc.applyUpdate(payload);
			// Forward to all subscribed tabs
			broadcastToSubscribedTabs(state, docId, MESSAGE_SYNC, payload);

			// Send INITIAL_SYNC to tabs on first sync message from server
			if (!initialSyncSent) {
				initialSyncSent = true;

				// Initialize local Workflow after first sync (doc now has data)
				// This is needed for expression resolution during local execution
				// We await this so workflow is ready before signaling INITIAL_SYNC to tabs
				if (!workflowInitialized) {
					workflowInitialized = true;
					await initializeWorkflowForServerMode(state, docId, docState);
				}

				// Signal ready AFTER workflow is initialized
				broadcastToSubscribedTabs(state, docId, MESSAGE_INITIAL_SYNC, new Uint8Array(0));
			}
		} else if (messageType === MESSAGE_AWARENESS) {
			// Apply to local awareness and forward to all tabs
			const awareness = docState.doc.getAwareness();
			awareness.applyUpdate(payload);
			broadcastToSubscribedTabs(state, docId, MESSAGE_AWARENESS, payload);
		}
	});

	// Handle connection state changes
	const unsubConnection = transport.onConnectionChange((connected) => {
		if (connected) {
			broadcastToSubscribedTabs(state, docId, MESSAGE_CONNECTED, new Uint8Array(0));
		} else {
			broadcastToSubscribedTabs(state, docId, MESSAGE_DISCONNECTED, new Uint8Array(0));
			initialSyncSent = false; // Reset for reconnection
		}
	});

	// Handle errors
	const unsubError = transport.onError(() => {
		// Error handling - transport will reconnect automatically
	});

	docState.serverTransport = transport;
	docState.serverTransportUnsub = () => {
		unsubReceive();
		unsubConnection();
		unsubError();
		transport.disconnect();
	};

	await transport.connect();
}

/**
 * Initialize a local Workflow instance for server mode.
 * The Workflow is kept in sync with the CRDT doc for expression resolution.
 * Handle computation is NOT set up - the server does that.
 */
async function initializeWorkflowForServerMode(
	state: CoordinatorState,
	docId: string,
	docState: CRDTDocumentState,
): Promise<void> {
	try {
		// Wait for node types to be loaded (handles race condition where
		// CRDT subscription happens before loadNodeTypes completes)
		if (state.nodeTypesPromise) {
			await state.nodeTypesPromise;
		}

		// Extract current state from CRDT doc (already populated from server sync)
		const nodes = getNodesFromDoc(docState.doc);
		const connections = getConnectionsFromDoc(docState.doc);
		const { name, settings } = getMetaFromDoc(docState.doc, docId);

		// Get node types from coordinator's global cache (loaded at init)
		const nodeTypes = getNodeTypes(state);
		const workerNodeTypes = createWorkerNodeTypes(nodeTypes);

		// Create Workflow instance with current CRDT state
		const workflow = new Workflow({
			id: docId,
			name,
			nodes,
			connections,
			active: false,
			nodeTypes: workerNodeTypes,
			settings,
		});
		docState.workflow = workflow;

		// Set up sync to keep Workflow updated as CRDT changes arrive from server
		const syncUnsub = syncWorkflowWithDoc(docState.doc, workflow);

		// Store unsub in serverTransportUnsub (combined with transport cleanup)
		const existingUnsub = docState.serverTransportUnsub;
		docState.serverTransportUnsub = () => {
			syncUnsub();
			existingUnsub?.();
		};
	} catch {
		// Failed to initialize workflow for server mode
	}
}

/**
 * Handle UNSUBSCRIBE message
 */
function handleUnsubscribe(state: CoordinatorState, tabId: string, docId: string): void {
	unsubscribeFromDocument(state, tabId, docId);
}

/**
 * Unsubscribe a tab from a document.
 * In worker mode, triggers final save before cleanup.
 * In server mode, just disconnects (server handles persistence).
 */
function unsubscribeFromDocument(state: CoordinatorState, tabId: string, docId: string): void {
	const subscription = state.crdtSubscriptions.get(tabId);
	if (subscription) {
		subscription.docIds.delete(docId);
	}

	// Check if any tabs are still subscribed to this document
	let hasSubscribers = false;
	for (const sub of state.crdtSubscriptions.values()) {
		if (sub.docIds.has(docId)) {
			hasSubscribers = true;
			break;
		}
	}

	// Clean up document if no subscribers
	if (!hasSubscribers) {
		if (docId.startsWith('exec-')) {
			// EXECUTION DOC: Clean up execution document
			cleanupExecutionDocument(state, docId);
		} else {
			const docState = state.crdtDocuments.get(docId);
			if (docState?.serverMode) {
				// SERVER MODE: No final save needed, server handles persistence
				cleanupDocument(state, docId);
			} else if (docState?.room) {
				// WORKER MODE: Trigger final save via room, then cleanup
				void docState.room.finalSave().finally(() => {
					cleanupDocument(state, docId);
				});
			} else {
				cleanupDocument(state, docId);
			}
		}
	}
}

/**
 * Clean up an execution document when no tabs are subscribed.
 */
function cleanupExecutionDocument(state: CoordinatorState, docId: string): void {
	const execDocState = state.crdtExecutionDocuments.get(docId);
	if (!execDocState) return;

	execDocState.doc.destroy();
	state.crdtExecutionDocuments.delete(docId);
}

/**
 * Clean up a document when no tabs are subscribed.
 * Server mode: Disconnect from server.
 * Worker mode: Destroy room and unsubscribe from observers.
 */
function cleanupDocument(state: CoordinatorState, docId: string): void {
	const docState = state.crdtDocuments.get(docId);
	if (!docState) return;

	if (docState.serverMode) {
		// SERVER MODE: Disconnect from server
		if (docState.serverTransportUnsub) {
			docState.serverTransportUnsub();
		}
	} else {
		// WORKER MODE: Destroy room and unsubscribe from observers
		if (docState.room) {
			docState.room.destroy();
		}

		if (docState.handleObserverUnsub) {
			docState.handleObserverUnsub();
		}
	}

	// Destroy the document (both modes)
	docState.doc.destroy();
	state.crdtDocuments.delete(docId);
}

// =============================================================================
// Sync and Awareness Message Handling
// =============================================================================

/**
 * Handle SYNC message from a tab.
 * In server mode, forward to server. In worker mode, apply locally and broadcast.
 */
function handleSyncMessage(
	state: CoordinatorState,
	tabId: string,
	docId: string,
	payload: Uint8Array,
): void {
	const docState = state.crdtDocuments.get(docId);
	if (!docState) return;

	if (docState.serverMode && docState.serverTransport?.connected) {
		// SERVER MODE: Forward to server (server applies and broadcasts back)
		docState.serverTransport.send(encodeMessage(MESSAGE_SYNC, payload));
	} else {
		// WORKER MODE: Apply locally and broadcast to other tabs
		docState.doc.applyUpdate(payload);
		broadcastToSubscribedTabs(state, docId, MESSAGE_SYNC, payload, tabId);

		// Schedule a debounced save to persist changes to the server
		docState.room?.scheduleSave();
	}
}

/**
 * Handle AWARENESS message from a tab.
 * In server mode, forward to server AND broadcast to tabs.
 * In worker mode, apply locally and broadcast.
 *
 * Also tracks clientIds per tab subscription for cleanup on disconnect.
 */
function handleAwarenessMessage(
	state: CoordinatorState,
	tabId: string,
	docId: string,
	payload: Uint8Array,
): void {
	const docState = state.crdtDocuments.get(docId);
	if (!docState) return;

	const subscription = state.crdtSubscriptions.get(tabId);
	const awareness = docState.doc.getAwareness();

	// Track clientIds from this tab for cleanup on disconnect
	// Set up one-time listener BEFORE applying update to capture the changes
	if (subscription) {
		const unsubscribe = awareness.onChange((event) => {
			unsubscribe(); // Only capture this one update

			// Get or create clientIds set for this doc
			let clientIds = subscription.clientIdsByDoc.get(docId);
			if (!clientIds) {
				clientIds = new Set<number>();
				subscription.clientIdsByDoc.set(docId, clientIds);
			}

			// Track added/updated clientIds, remove removed ones
			for (const id of event.added) clientIds.add(id);
			for (const id of event.updated) clientIds.add(id);
			for (const id of event.removed) clientIds.delete(id);
		});

		// Apply the update (triggers the onChange listener)
		awareness.applyUpdate(payload);
	} else {
		// No subscription to track, just apply
		awareness.applyUpdate(payload);
	}

	if (docState.serverMode && docState.serverTransport?.connected) {
		// SERVER MODE: Forward to server AND broadcast to tabs
		// The server broadcasts to "other clients" but the coordinator is the only client,
		// so we handle cross-tab awareness directly.
		docState.serverTransport.send(encodeMessage(MESSAGE_AWARENESS, payload));
		broadcastToSubscribedTabs(state, docId, MESSAGE_AWARENESS, payload);
	} else {
		// WORKER MODE: Broadcast to ALL tabs (including sender) to support split-view.
		// Each view has a unique awareness clientId, so echoing back is safe - views filter
		// out their own clientId when rendering collaborators, and the origin tracking in
		// useCRDTSync prevents re-sending (only local changes are sent to the coordinator).
		broadcastToSubscribedTabs(state, docId, MESSAGE_AWARENESS, payload);
	}
}

// =============================================================================
// Broadcasting
// =============================================================================

/**
 * Send an encoded message to a tab
 */
function sendToTab(
	port: MessagePort,
	messageType: number,
	docId: string,
	payload: Uint8Array,
): void {
	// Encode docId length (2 bytes, big-endian) + docId + payload
	const docIdBytes = new TextEncoder().encode(docId);
	const message = new Uint8Array(1 + 2 + docIdBytes.length + payload.length);
	message[0] = messageType;
	message[1] = (docIdBytes.length >> 8) & 0xff;
	message[2] = docIdBytes.length & 0xff;
	message.set(docIdBytes, 3);
	message.set(payload, 3 + docIdBytes.length);

	port.postMessage(message.buffer);
}

/**
 * Broadcast a message to all tabs subscribed to a document, excluding one tab
 */
function broadcastToSubscribedTabs(
	state: CoordinatorState,
	docId: string,
	messageType: number,
	payload: Uint8Array,
	excludeTabId?: string,
): void {
	state.crdtSubscriptions.forEach((subscription, tabId) => {
		if (tabId !== excludeTabId && subscription.docIds.has(docId)) {
			sendToTab(subscription.crdtPort, messageType, docId, payload);
		}
	});
}

// =============================================================================
// Expression Resolution Observer
// =============================================================================

/**
 * Set up an observer to re-resolve expressions when node parameters change.
 * Returns an unsubscribe function.
 */
function setupExpressionResolution(
	state: CoordinatorState,
	docState: CRDTDocumentState,
	execDocState: CRDTExecutionDocumentState,
): () => void {
	const nodesMap = docState.doc.getMap('nodes');

	// Track which nodes need re-resolution (debounce multiple changes)
	let pendingNodeIds = new Set<string>();
	let resolveTimeout: ReturnType<typeof setTimeout> | null = null;

	// Use onDeepChange which returns an unsubscribe function
	const unsubscribe = nodesMap.onDeepChange((changes) => {
		for (const change of changes) {
			// change.path format: [nodeId, 'parameters', ...nestedPath]
			// We only care about parameter changes
			const nodeId = change.path[0];
			if (typeof nodeId !== 'string') continue;

			// Check if this change is in the parameters subtree
			if (change.path.length >= 2 && change.path[1] === 'parameters') {
				pendingNodeIds.add(nodeId);
			}
		}

		// Debounce resolution (multiple parameter changes might come together)
		if (pendingNodeIds.size > 0 && !resolveTimeout) {
			resolveTimeout = setTimeout(() => {
				for (const nodeId of pendingNodeIds) {
					resolveNodeExpressions(state, docState, execDocState, nodeId);
				}
				pendingNodeIds = new Set();
				resolveTimeout = null;

				// Broadcast the execution doc update to subscribed tabs
				const execDocId = `exec-${execDocState.workflowId}`;
				const update = execDocState.doc.encodeState();
				state.crdtSubscriptions.forEach((subscription) => {
					if (subscription.docIds.has(execDocId)) {
						sendToTab(subscription.crdtPort, MESSAGE_SYNC, execDocId, update);
					}
				});
			}, 10); // Small delay to batch rapid changes
		}
	});

	return () => {
		unsubscribe();
		if (resolveTimeout) {
			clearTimeout(resolveTimeout);
		}
	};
}

// =============================================================================
// Document Seeding
// =============================================================================

/**
 * Seed a document with workflow data from the REST API
 */
async function seedDocument(
	state: CoordinatorState,
	docId: string,
	docState: CRDTDocumentState,
): Promise<void> {
	try {
		// Wait for node types to be loaded (handles race condition where
		// CRDT subscription happens before loadNodeTypes completes)
		if (state.nodeTypesPromise) {
			await state.nodeTypesPromise;
		}

		// Fetch workflow data via REST API
		// Use state.baseUrl (set during coordinator.initialize) for REST calls
		const workflowData = await fetchWorkflowData(state.baseUrl!, docId);
		if (!workflowData) {
			return;
		}

		// Get node types from coordinator's global cache (loaded at init)
		const nodeTypes = getNodeTypes(state);
		const workerNodeTypes = createWorkerNodeTypes(nodeTypes);

		// Create Workflow instance for handle computation
		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes: workerNodeTypes,
			settings: workflowData.settings,
		});
		docState.workflow = workflow;

		// Compute handles for all nodes using shared function from n8n-workflow
		const nodesWithHandles = computeAllNodeHandles(workflow, workflowData.nodes, workerNodeTypes);

		// Use shared seeding function, passing seedValueDeep from @n8n/crdt
		// Cast to SeedValueDeepFn since @n8n/crdt CRDTDoc is compatible with CRDTDocLike
		seedWorkflowDoc(
			docState.doc,
			{
				id: workflowData.id,
				name: workflowData.name,
				nodes: nodesWithHandles,
				connections: workflowData.connections,
				settings: workflowData.settings,
				pinData: workflowData.pinData,
			},
			seedValueDeep as SeedValueDeepFn,
		);

		// Set up sync between CRDT document and Workflow instance
		// This keeps the Workflow updated when nodes/edges change, so handle recomputation
		// can access the latest workflow state
		const syncUnsub = syncWorkflowWithDoc(docState.doc, workflow);

		// Set up handle recomputation (uses the synced workflow)
		const handleUnsub = setupHandleRecomputation(docState.doc, workflow, workerNodeTypes);

		// Set up expression renaming when node names change
		// Cast to SetNestedValueFn since @n8n/crdt CRDTDoc is compatible with CRDTDocLike
		const expressionUnsub = setupExpressionRenaming(
			docState.doc,
			setNestedValue as SetNestedValueFn,
		);

		// Set up expression resolution on parameter changes
		// When node parameters change, re-resolve expressions for that node
		const execDocState = getOrCreateExecutionDoc(state, docId);
		const expressionResolutionUnsub = setupExpressionResolution(state, docState, execDocState);

		// Store handle observer unsub for cleanup
		docState.handleObserverUnsub = handleUnsub;

		// Set up update broadcasting
		const updateUnsub = docState.doc.onUpdate((update) => {
			broadcastToSubscribedTabs(state, docId, MESSAGE_SYNC, update);
		});

		// Combined unsubscribe for the room
		const unsubscribe = () => {
			syncUnsub();
			expressionUnsub();
			expressionResolutionUnsub();
			updateUnsub();
		};

		// Create the workflow room with a save callback
		// Use state.baseUrl (set during coordinator.initialize) for REST calls
		docState.room = new WorkflowRoom(
			docState.doc,
			workflow,
			unsubscribe,
			workflowData.versionId ?? '',
			async (room) => await saveWorkflowViaRest(state.baseUrl!, room),
		);

		docState.seeded = true;

		// Initial expression resolution for all nodes
		// Uses pinned data as execution context (before actual execution)
		resolveAllNodeExpressions(state, docState, execDocState);

		// Broadcast the execution doc to all subscribed tabs so they can see resolved expressions
		const execDocId = `exec-${docId}`;
		const update = execDocState.doc.encodeState();
		state.crdtSubscriptions.forEach((subscription) => {
			if (subscription.docIds.has(execDocId)) {
				sendToTab(subscription.crdtPort, MESSAGE_SYNC, execDocId, update);
			}
		});
	} catch {
		// Failed to seed document
	}
}

// =============================================================================
// REST API Helpers
// =============================================================================

interface WorkflowData {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: Record<string, unknown>;
	pinData?: IPinData;
	versionId?: string;
}

/**
 * Fetch workflow data from the REST API
 */
async function fetchWorkflowData(
	baseUrl: string,
	workflowId: string,
): Promise<WorkflowData | null> {
	// Ensure no double slashes by removing trailing slash from baseUrl
	const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
	const url = `${normalizedBaseUrl}/rest/workflows/${workflowId}`;
	try {
		const response = await fetch(url, {
			credentials: 'include', // Include cookies for authentication
		});
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		return data.data as WorkflowData;
	} catch {
		return null;
	}
}

/**
 * Get the global node types cache from coordinator state.
 * Node types are loaded once at init and shared across all documents.
 */
function getNodeTypes(state: CoordinatorState): Map<string, INodeTypeDescription> {
	return state.nodeTypes ?? new Map();
}

// =============================================================================
// Node Types Adapter
// =============================================================================

/**
 * Create an INodeTypes adapter from a Map of node types.
 *
 * The map is keyed by "name@version" for precise version lookups.
 * This matches how SQLite stores node types (one row per version).
 */
function createWorkerNodeTypes(nodeTypes: Map<string, INodeTypeDescription>): INodeTypes {
	return {
		getByName(name: string) {
			// Find any node type with matching name, prefer latest version
			let latest: INodeTypeDescription | undefined;
			let latestVersion = -1;
			nodeTypes.forEach((nodeType, key) => {
				// Key format is "name@version"
				if (key.startsWith(`${name}@`)) {
					const versionStr = key.slice(name.length + 1);
					const version = parseFloat(versionStr);
					if (version > latestVersion) {
						latestVersion = version;
						latest = nodeType;
					}
				}
			});
			return latest ? { description: latest } : undefined;
		},
		getByNameAndVersion(name: string, version?: number) {
			if (version === undefined) {
				return this.getByName(name);
			}
			// Direct lookup by name@version key
			const key = `${name}@${version}`;
			const nodeType = nodeTypes.get(key);
			if (nodeType) {
				return { description: nodeType };
			}
			return undefined;
		},
	} as INodeTypes;
}

// =============================================================================
// Server Persistence
// =============================================================================

/**
 * Save the workflow to the server via REST API.
 * This is the save callback used by WorkflowRoom.
 */
async function saveWorkflowViaRest(baseUrl: string, room: WorkflowRoom): Promise<void> {
	const { workflow } = room;
	const docId = room.doc.id;

	// Skip if no changes
	if (!room.hasUnsavedChanges()) {
		return;
	}

	try {
		// Convert nodes from object to array format
		const nodes = Object.values(workflow.nodes);
		const connections = workflow.connectionsBySourceNode;

		// Build the update payload
		// autosaved: true indicates this is an automatic save (not manual user save)
		// This affects how workflow history is created
		const payload = {
			name: workflow.name,
			nodes,
			connections,
			settings: workflow.settings,
			pinData: workflow.pinData,
			autosaved: true,
		};

		// Save via REST API
		const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
		const response = await fetch(`${normalizedBaseUrl}/rest/workflows/${docId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Failed to save workflow: ${response.status} ${response.statusText}`);
		}

		// Mark room as clean after successful save
		room.markClean();
	} catch {
		// Failed to save workflow
	}
}
