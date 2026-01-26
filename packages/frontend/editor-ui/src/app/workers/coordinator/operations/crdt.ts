/**
 * CRDT Operations for Coordinator SharedWorker
 *
 * The Coordinator acts as the "CRDT server" for Worker Mode:
 * - Holds CRDT documents in memory (source of truth)
 * - Computes handles on parameter changes
 * - Broadcasts updates to all subscribed tabs
 *
 * This mirrors the server's CRDTWebSocketService responsibilities.
 */

import {
	CRDTEngine,
	createCRDTProvider,
	MESSAGE_SYNC,
	MESSAGE_AWARENESS,
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_INITIAL_SYNC,
	decodeWithDocId,
	decodeString,
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
	type IConnections,
	type INode,
	type INodeTypeDescription,
	type INodeTypes,
	type SeedValueDeepFn,
	type SetNestedValueFn,
} from 'n8n-workflow';

import type { CoordinatorState, CRDTDocumentState } from '../types';

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
 * Create a CRDT port for a tab.
 * Returns a MessagePort that the tab will use for CRDT binary messages.
 */
export function createCrdtPort(state: CoordinatorState, tabId: string): MessagePort {
	// Create a new MessageChannel
	const channel = new MessageChannel();

	// Set up the internal port (stays in coordinator)
	const internalPort = channel.port1;
	internalPort.onmessage = (event: MessageEvent<ArrayBuffer>) => {
		void handleCrdtMessage(state, tabId, event.data);
	};
	internalPort.start();

	// Initialize subscription if not exists
	if (!state.crdtSubscriptions.has(tabId)) {
		state.crdtSubscriptions.set(tabId, {
			docIds: new Set(),
			crdtPort: internalPort,
		});
	} else {
		// Update the port
		const sub = state.crdtSubscriptions.get(tabId)!;
		sub.crdtPort = internalPort;
	}

	// Return the external port for the tab
	return channel.port2;
}

/**
 * Clean up CRDT subscription when tab disconnects
 */
export function cleanupCrdtSubscription(state: CoordinatorState, tabId: string): void {
	const subscription = state.crdtSubscriptions.get(tabId);
	if (!subscription) return;

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
// Subscription Handling
// =============================================================================

/**
 * Handle SUBSCRIBE message - create/get doc, seed from Data Worker, send initial state
 */
async function handleSubscribe(
	state: CoordinatorState,
	tabId: string,
	docId: string,
	baseUrl: string,
): Promise<void> {
	ensureCRDTProvider(state);

	const subscription = state.crdtSubscriptions.get(tabId);
	if (!subscription) {
		console.error('[CRDT Coordinator] No subscription found for tab', tabId);
		return;
	}

	// Add doc to subscription
	subscription.docIds.add(docId);

	// Get or create document state
	let docState = state.crdtDocuments.get(docId);
	if (!docState) {
		const doc = state.crdtProvider!.createDoc(docId);
		docState = {
			doc,
			nodeTypes: new Map(),
			handleObserverUnsub: null,
			seeded: false,
			baseUrl,
			room: null,
		};
		state.crdtDocuments.set(docId, docState);
	}

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

/**
 * Handle UNSUBSCRIBE message
 */
function handleUnsubscribe(state: CoordinatorState, tabId: string, docId: string): void {
	unsubscribeFromDocument(state, tabId, docId);
}

/**
 * Unsubscribe a tab from a document
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
		const docState = state.crdtDocuments.get(docId);
		if (docState?.room) {
			// Trigger final save via room, then cleanup
			void docState.room.finalSave().finally(() => {
				cleanupDocument(state, docId);
			});
		} else {
			cleanupDocument(state, docId);
		}
	}
}

/**
 * Clean up a document when no tabs are subscribed
 */
function cleanupDocument(state: CoordinatorState, docId: string): void {
	const docState = state.crdtDocuments.get(docId);
	if (!docState) return;

	// Destroy the room (handles cleanup of sync subscriptions and debounce)
	if (docState.room) {
		docState.room.destroy();
	}

	// Unsubscribe from handle recomputation
	if (docState.handleObserverUnsub) {
		docState.handleObserverUnsub();
	}

	// Destroy the document
	docState.doc.destroy();
	state.crdtDocuments.delete(docId);

	console.log('[CRDT Coordinator] Document cleaned up', docId);
}

// =============================================================================
// Sync and Awareness Message Handling
// =============================================================================

/**
 * Handle SYNC message from a tab
 */
function handleSyncMessage(
	state: CoordinatorState,
	tabId: string,
	docId: string,
	payload: Uint8Array,
): void {
	const docState = state.crdtDocuments.get(docId);
	if (!docState) return;

	// Apply update to local document
	docState.doc.applyUpdate(payload);

	// Broadcast to other tabs
	broadcastToSubscribedTabs(state, docId, MESSAGE_SYNC, payload, tabId);

	// Schedule a debounced save to persist changes to the server
	docState.room?.scheduleSave();
}

/**
 * Handle AWARENESS message from a tab
 */
function handleAwarenessMessage(
	state: CoordinatorState,
	tabId: string,
	docId: string,
	payload: Uint8Array,
): void {
	const docState = state.crdtDocuments.get(docId);
	if (!docState) return;

	// Apply awareness update
	const awareness = docState.doc.getAwareness();
	awareness.applyUpdate(payload);

	// Broadcast to other tabs
	broadcastToSubscribedTabs(state, docId, MESSAGE_AWARENESS, payload, tabId);
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
		// Fetch workflow data via REST API
		const workflowData = await fetchWorkflowData(docState.baseUrl, docId);
		if (!workflowData) {
			console.error('[CRDT Coordinator] Failed to fetch workflow data', docId);
			return;
		}

		// Fetch node types for handle computation
		const nodeTypes = await fetchNodeTypesForWorkflow(docState.baseUrl, workflowData.nodes, state);

		// Store node types in document state
		docState.nodeTypes = nodeTypes;

		// Create a WorkerNodeTypes adapter
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

		console.log(
			'[CRDT Coordinator] Computed handles for nodes:',
			nodesWithHandles.map((n) => ({
				id: n.id,
				name: n.name,
				type: n.type,
				inputCount: n.inputs?.length ?? 0,
				outputCount: n.outputs?.length ?? 0,
			})),
		);

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
			updateUnsub();
		};

		// Create the workflow room with a save callback
		docState.room = new WorkflowRoom(
			docState.doc,
			workflow,
			unsubscribe,
			workflowData.versionId ?? '',
			async (room) => await saveWorkflowViaRest(docState.baseUrl, room),
		);

		docState.seeded = true;
	} catch (error) {
		console.error('[CRDT Coordinator] Failed to seed document', docId, error);
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
	console.log('[CRDT Coordinator] Fetching workflow from:', url);
	try {
		const response = await fetch(url, {
			credentials: 'include', // Include cookies for authentication
		});
		if (!response.ok) {
			console.error(
				'[CRDT Coordinator] Failed to fetch workflow',
				response.status,
				response.statusText,
			);
			return null;
		}
		const data = await response.json();
		return data.data as WorkflowData;
	} catch (error) {
		console.error('[CRDT Coordinator] Error fetching workflow', error);
		return null;
	}
}

/**
 * Fetch node types needed for a workflow
 * First tries SQLite cache via Data Worker, falls back to REST API
 */
async function fetchNodeTypesForWorkflow(
	baseUrl: string,
	nodes: INode[],
	state: CoordinatorState,
): Promise<Map<string, INodeTypeDescription>> {
	const nodeTypes = new Map<string, INodeTypeDescription>();

	// Get unique node type names
	const typeNames = new Set(nodes.map((n) => n.type));

	// Try to get from SQLite via active data worker first
	const activeTab = state.tabs.get(state.activeTabId ?? '');
	if (activeTab?.dataWorker) {
		try {
			for (const typeName of Array.from(typeNames)) {
				const result = await activeTab.dataWorker.query(
					`SELECT data FROM nodeTypes WHERE id LIKE '${typeName}@%' ORDER BY id DESC LIMIT 1`,
				);
				if (result.rows.length > 0) {
					const data = JSON.parse(result.rows[0][0] as string) as INodeTypeDescription;
					// Use node name as key - the adapter will match by name and version
					nodeTypes.set(data.name, data);
				}
			}
		} catch {
			// Fall through to REST API
		}
	}

	// Fetch any missing types from REST API
	const missingTypes = Array.from(typeNames).filter((name) => {
		for (const key of Array.from(nodeTypes.keys())) {
			if (key.startsWith(`${name}@`)) return false;
		}
		return true;
	});

	console.log('[CRDT Coordinator] Node types from SQLite:', Array.from(nodeTypes.keys()));
	console.log('[CRDT Coordinator] Missing types to fetch from REST:', missingTypes);

	if (missingTypes.length > 0) {
		try {
			// Ensure no double slashes by removing trailing slash from baseUrl
			const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
			const response = await fetch(`${normalizedBaseUrl}/rest/node-types`, {
				credentials: 'include', // Include cookies for authentication
			});
			if (response.ok) {
				const data = await response.json();
				console.log(
					'[CRDT Coordinator] Fetched node types from REST, count:',
					data.data?.length ?? 0,
				);
				for (const nodeType of data.data as INodeTypeDescription[]) {
					// Use node name as key - the adapter will match by name and version
					nodeTypes.set(nodeType.name, nodeType);
				}
			} else {
				console.error('[CRDT Coordinator] Failed to fetch node types from REST:', response.status);
			}
		} catch (error) {
			console.error('[CRDT Coordinator] Error fetching node types', error);
		}
	}

	console.log('[CRDT Coordinator] Final node types count:', nodeTypes.size);
	return nodeTypes;
}

// =============================================================================
// Node Types Adapter
// =============================================================================

/**
 * Get all versions supported by a node type description
 */
function getNodeTypeVersions(nodeType: INodeTypeDescription): number[] {
	const version = nodeType.version;
	if (typeof version === 'number') {
		return [version];
	}
	if (Array.isArray(version)) {
		return version;
	}
	return [1];
}

/**
 * Create an INodeTypes adapter from a Map of node types.
 *
 * Note: Node types can have multiple versions (e.g., version: [2, 2.1, 2.2, 2.3]).
 * The map key format is `name@version1,version2,...` but we look up by individual version.
 */
function createWorkerNodeTypes(nodeTypes: Map<string, INodeTypeDescription>): INodeTypes {
	return {
		getByName(name: string) {
			// Find any node type with matching name, prefer latest version
			let latest: INodeTypeDescription | undefined;
			let latestVersion = -1;
			nodeTypes.forEach((nodeType) => {
				if (nodeType.name === name) {
					const versions = getNodeTypeVersions(nodeType);
					const maxVersion = Math.max(...versions);
					if (maxVersion > latestVersion) {
						latestVersion = maxVersion;
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
			// Find node type that supports this specific version
			for (const nodeType of nodeTypes.values()) {
				if (nodeType.name === name) {
					const versions = getNodeTypeVersions(nodeType);
					if (versions.includes(version)) {
						return { description: nodeType };
					}
				}
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
		console.log('[CRDT Coordinator] No changes to save, skipping', docId);
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
			autosaved: true,
		};

		console.log('[CRDT Coordinator] Saving workflow', {
			docId,
			nodeCount: nodes.length,
			connectionCount: Object.keys(connections).length,
		});

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

		console.log('[CRDT Coordinator] Saved workflow successfully', { docId });
	} catch (error) {
		console.error('[CRDT Coordinator] Failed to save workflow', docId, error);
	}
}
