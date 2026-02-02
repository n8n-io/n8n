/**
 * Execution Push Connection Management
 *
 * Manages a single WebSocket push connection for receiving execution updates.
 * The connection is shared across all executions - messages are identified
 * by executionId in the payload.
 *
 * Push events update CRDT execution documents which are synced to subscribed tabs.
 */

import { v4 as uuid } from 'uuid';
import { CRDTEngine, createCRDTProvider, MESSAGE_SYNC, MESSAGE_INITIAL_SYNC } from '@n8n/crdt';
import type { CRDTDoc } from '@n8n/crdt';
import type { CoordinatorState, CRDTExecutionDocumentState } from '../types';
import {
	handleExecutionStarted,
	handleNodeExecuteBefore,
	handleNodeExecuteAfter,
	handleNodeExecuteAfterData,
	handleExecutionFinished,
} from '../../../../features/crdt/composables/crdt-execution-helpers';
import type {
	ExecutionStartedPushData,
	NodeExecuteBeforePushData,
	NodeExecuteAfterPushData,
	NodeExecuteAfterDataPushData,
	ExecutionFinishedPushData,
} from '../../../../features/crdt/types/executionDocument.types';
import { resolveNodeExpressions, resolveAllNodeExpressions } from './resolveExpressions';

// Single push connection for the coordinator (lazy initialized on first execute)
let pushConnection: WebSocket | null = null;
const pushRef: string = uuid(); // Initialized once at module load
let connectionPromise: Promise<string> | null = null; // Prevents race conditions

// Reference to coordinator state (set when first used)
let coordinatorState: CoordinatorState | null = null;

// CRDT provider for execution documents
let executionProvider: ReturnType<typeof createCRDTProvider> | null = null;

/**
 * Ensure the execution CRDT provider is initialized
 */
function ensureExecutionProvider(): ReturnType<typeof createCRDTProvider> {
	if (!executionProvider) {
		executionProvider = createCRDTProvider({ engine: CRDTEngine.yjs });
	}
	return executionProvider;
}

/**
 * Get or create an execution document for a workflow.
 * Execution documents are keyed by `exec-{workflowId}`.
 */
export function getOrCreateExecutionDoc(
	state: CoordinatorState,
	workflowId: string,
): CRDTExecutionDocumentState {
	const execDocId = `exec-${workflowId}`;
	let docState = state.crdtExecutionDocuments.get(execDocId);

	if (!docState) {
		const provider = ensureExecutionProvider();
		const doc = provider.createDoc(execDocId);
		docState = {
			doc,
			workflowId,
			executionId: null,
		};
		state.crdtExecutionDocuments.set(execDocId, docState);
	}

	return docState;
}

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
 * Broadcast execution document update to all subscribed tabs.
 */
function broadcastExecutionUpdate(
	state: CoordinatorState,
	execDocId: string,
	update: Uint8Array,
): void {
	console.log(
		'[CRDT broadcastExecutionUpdate] Broadcasting to execDocId:',
		execDocId,
		'subscriptions:',
		state.crdtSubscriptions.size,
	);
	state.crdtSubscriptions.forEach((subscription, tabId) => {
		const hasDoc = subscription.docIds.has(execDocId);
		console.log(
			'[CRDT broadcastExecutionUpdate] Tab',
			tabId,
			'subscribed to',
			execDocId,
			':',
			hasDoc,
			'docIds:',
			Array.from(subscription.docIds),
		);
		if (hasDoc) {
			sendToTab(subscription.crdtPort, MESSAGE_SYNC, execDocId, update);
		}
	});
}

/**
 * Get the workflow CRDT document for a given workflow ID.
 * Needed for edge item count updates (reads edge/node info from workflow doc).
 */
function getWorkflowDoc(state: CoordinatorState, workflowId: string): CRDTDoc | null {
	const docState = state.crdtDocuments.get(workflowId);
	return docState?.doc ?? null;
}

/**
 * Ensure push connection exists. Returns the pushRef.
 * Connection is shared across all executions.
 *
 * @param baseUrl - Base URL for the push endpoint (e.g., "http://localhost:5678")
 * @param state - Coordinator state for accessing CRDT documents
 * @returns Promise resolving to the pushRef
 */
export async function ensurePushConnection(
	baseUrl: string,
	state?: CoordinatorState,
): Promise<string> {
	// Store coordinator state reference for message handling
	if (state) {
		coordinatorState = state;
	}

	// Return existing connection
	if (pushConnection?.readyState === WebSocket.OPEN) {
		return pushRef;
	}

	// Return pending connection (avoid race conditions)
	if (connectionPromise) {
		return await connectionPromise;
	}

	// Create new connection
	connectionPromise = connectPush(baseUrl);
	return await connectionPromise;
}

async function connectPush(baseUrl: string): Promise<string> {
	// Convert HTTP base URL to WebSocket URL for push connection
	// http:// → ws://, https:// → wss://
	const wsBaseUrl = baseUrl
		.replace(/\/$/, '')
		.replace(/^https:/, 'wss:')
		.replace(/^http:/, 'ws:');
	const wsUrl = `${wsBaseUrl}/rest/push?pushRef=${pushRef}`;

	return await new Promise((resolve, reject) => {
		const socket = new WebSocket(wsUrl);
		socket.binaryType = 'arraybuffer';

		socket.onopen = () => {
			pushConnection = socket;
			connectionPromise = null;
			resolve(pushRef);
		};

		socket.onerror = () => {
			connectionPromise = null;
			reject(new Error('Push connection failed'));
		};

		socket.onclose = () => {
			pushConnection = null;
		};

		socket.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
			handlePushMessage(event);
		};
	});
}

/**
 * Handle incoming push message from the server.
 * Parses the message and updates the appropriate execution CRDT document.
 */
function handlePushMessage(event: MessageEvent<string | ArrayBuffer>): void {
	let messageData: string;
	if (event.data instanceof ArrayBuffer) {
		messageData = new TextDecoder('utf-8').decode(new Uint8Array(event.data));
	} else {
		messageData = event.data;
	}

	const message = JSON.parse(messageData) as { type: string; data: unknown };

	// Skip if no coordinator state
	if (!coordinatorState) {
		return;
	}

	// Route message to appropriate handler
	switch (message.type) {
		case 'executionStarted':
			handleExecutionStartedMessage(message.data as ExecutionStartedPushData);
			break;
		case 'nodeExecuteBefore':
			handleNodeExecuteBeforeMessage(message.data as NodeExecuteBeforePushData);
			break;
		case 'nodeExecuteAfter':
			handleNodeExecuteAfterMessage(message.data as NodeExecuteAfterPushData);
			break;
		case 'nodeExecuteAfterData':
			handleNodeExecuteAfterDataMessage(message.data as NodeExecuteAfterDataPushData);
			break;
		case 'executionFinished':
			handleExecutionFinishedMessage(message.data as ExecutionFinishedPushData);
			break;
		// Ignore other message types (heartbeat, etc.)
	}
}

/**
 * Handle executionStarted push message.
 * Creates/resets the execution document and initializes metadata.
 */
function handleExecutionStartedMessage(data: ExecutionStartedPushData): void {
	if (!coordinatorState) return;

	const docState = getOrCreateExecutionDoc(coordinatorState, data.workflowId);
	docState.executionId = data.executionId;

	// Get workflow doc for node index
	const workflowDoc = getWorkflowDoc(coordinatorState, data.workflowId);
	if (!workflowDoc) {
		return;
	}

	// Update execution document
	handleExecutionStarted(docState.doc, workflowDoc, data);

	// Broadcast update to subscribed tabs
	const update = docState.doc.encodeState();
	const execDocId = `exec-${data.workflowId}`;
	broadcastExecutionUpdate(coordinatorState, execDocId, update);

	// Also send initial sync signal for newly subscribed tabs
	coordinatorState.crdtSubscriptions.forEach((subscription) => {
		if (subscription.docIds.has(execDocId)) {
			sendToTab(subscription.crdtPort, MESSAGE_INITIAL_SYNC, execDocId, new Uint8Array(0));
		}
	});
}

/**
 * Handle nodeExecuteBefore push message.
 * Creates initial task data entry for the node.
 */
function handleNodeExecuteBeforeMessage(data: NodeExecuteBeforePushData): void {
	if (!coordinatorState) return;

	// Find the execution doc by executionId
	const docState = findExecutionDocByExecutionId(coordinatorState, data.executionId);
	if (!docState) {
		return;
	}

	// Update execution document
	handleNodeExecuteBefore(docState.doc, data);

	// Broadcast update
	const update = docState.doc.encodeState();
	broadcastExecutionUpdate(coordinatorState, `exec-${docState.workflowId}`, update);
}

/**
 * Handle nodeExecuteAfter push message.
 * Updates task data with completion info and edge item counts.
 */
function handleNodeExecuteAfterMessage(data: NodeExecuteAfterPushData): void {
	if (!coordinatorState) return;

	// Find the execution doc by executionId
	const docState = findExecutionDocByExecutionId(coordinatorState, data.executionId);
	if (!docState) {
		return;
	}

	// Get workflow doc for edge lookup
	const workflowDoc = getWorkflowDoc(coordinatorState, docState.workflowId);
	if (!workflowDoc) {
		return;
	}

	// Update execution document
	handleNodeExecuteAfter(docState.doc, workflowDoc, data);

	// Broadcast update
	const update = docState.doc.encodeState();
	broadcastExecutionUpdate(coordinatorState, `exec-${docState.workflowId}`, update);
}

/**
 * Handle nodeExecuteAfterData push message.
 * Adds the actual output data to the task.
 */
function handleNodeExecuteAfterDataMessage(data: NodeExecuteAfterDataPushData): void {
	console.log('[CRDT Push] nodeExecuteAfterData received:', {
		nodeName: data.nodeName,
		executionId: data.executionId,
		hasData: !!data.data?.data,
		executionIndex: data.data?.executionIndex,
	});

	if (!coordinatorState) return;

	// Find the execution doc by executionId
	const docState = findExecutionDocByExecutionId(coordinatorState, data.executionId);
	if (!docState) {
		console.log('[CRDT Push] No docState found for executionId:', data.executionId);
		return;
	}

	// Get workflow doc for edge lookup
	const workflowDoc = getWorkflowDoc(coordinatorState, docState.workflowId);
	if (!workflowDoc) {
		console.log('[CRDT Push] No workflowDoc found for workflowId:', docState.workflowId);
		return;
	}

	console.log('[CRDT Push] Updating execution document for node:', data.nodeName);
	// Update execution document
	handleNodeExecuteAfterData(docState.doc, workflowDoc, data);

	// Re-resolve expressions for ALL nodes now that we have new execution data
	// Expressions like $('nodeName') can reference any node, not just parents
	const workflowDocState = coordinatorState.crdtDocuments.get(docState.workflowId);
	if (workflowDocState?.workflow) {
		resolveAllNodeExpressions(coordinatorState, workflowDocState, docState);
	}

	// Broadcast update
	const update = docState.doc.encodeState();
	broadcastExecutionUpdate(coordinatorState, `exec-${docState.workflowId}`, update);
}

/**
 * Handle executionFinished push message.
 * Updates final execution status.
 */
function handleExecutionFinishedMessage(data: ExecutionFinishedPushData): void {
	if (!coordinatorState) return;

	// Find the execution doc by executionId
	const docState = findExecutionDocByExecutionId(coordinatorState, data.executionId);
	if (!docState) {
		return;
	}

	// Update execution document
	handleExecutionFinished(docState.doc, data);

	// Broadcast update
	const update = docState.doc.encodeState();
	broadcastExecutionUpdate(coordinatorState, `exec-${docState.workflowId}`, update);
}

/**
 * Find execution document state by execution ID.
 * Searches through all execution documents to find the one with matching executionId.
 */
function findExecutionDocByExecutionId(
	state: CoordinatorState,
	executionId: string,
): CRDTExecutionDocumentState | null {
	for (const docState of state.crdtExecutionDocuments.values()) {
		if (docState.executionId === executionId) {
			return docState;
		}
	}
	return null;
}

/**
 * Get the pushRef for this coordinator instance.
 */
export function getPushRef(): string {
	return pushRef;
}
