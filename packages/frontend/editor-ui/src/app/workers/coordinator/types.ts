/**
 * Coordinator Types
 *
 * This module defines types used by the coordinator SharedWorker.
 * These types are specific to the coordination layer that manages
 * which tab's dedicated worker is active.
 */

import type * as Comlink from 'comlink';
import type { CRDTDoc, CRDTProvider, SyncTransport, Unsubscribe } from '@n8n/crdt';
import type { INodeTypeDescription, Workflow, WorkflowRoom } from 'n8n-workflow';

import type { DataWorkerApi } from '../data/worker';

/**
 * Represents a connected tab in the coordinator
 */
export interface TabConnection {
	id: string;
	port: MessagePort;
	dataWorker: Comlink.Remote<DataWorkerApi> | null;
	isActive: boolean;
}

/**
 * CRDT subscription for a tab
 */
export interface CRDTSubscription {
	/** Document IDs this tab is subscribed to */
	docIds: Set<string>;
	/** Dedicated port for CRDT binary messages */
	crdtPort: MessagePort;
	/** Awareness clientIds per docId - for cleanup on disconnect */
	clientIdsByDoc: Map<string, Set<number>>;
}

/**
 * CRDT document state held by the coordinator.
 *
 * The coordinator supports two modes per document:
 * - **Worker Mode**: Coordinator holds the document, computes handles, saves via REST API
 * - **Server Mode**: Coordinator proxies to WebSocket server, server holds the document
 *
 * Mode is determined by the serverUrl: WebSocket URL = server mode, otherwise worker mode.
 */
export interface CRDTDocumentState {
	/** CRDT document (source of truth in worker mode, proxy in server mode) */
	doc: CRDTDoc;
	/** Unsubscribe function for handle recomputation observer (worker mode only) */
	handleObserverUnsub: Unsubscribe | null;
	/** Whether the document has been seeded with initial data (worker mode only) */
	seeded: boolean;
	/** Workflow room managing persistence (worker mode only, null until seeded) */
	room: WorkflowRoom | null;
	/** Workflow instance for handle computation (worker mode only, null until seeded) */
	workflow?: Workflow;

	// Server mode fields
	/** True if using server mode (WebSocket proxy to server) */
	serverMode: boolean;
	/** WebSocket transport for server mode (null in worker mode) */
	serverTransport: SyncTransport | null;
	/** Cleanup function for server transport subscriptions (null in worker mode) */
	serverTransportUnsub: (() => void) | null;
}

/**
 * CRDT execution document state held by the coordinator.
 *
 * Execution documents track running execution state from push events.
 * They are keyed by `exec-{workflowId}` and synced to subscribed tabs.
 * The coordinator writes to these documents; tabs read only.
 */
export interface CRDTExecutionDocumentState {
	/** CRDT execution document (source of truth) */
	doc: CRDTDoc;
	/** The workflow ID this execution document is for */
	workflowId: string;
	/** Current execution ID (null if no active execution) */
	executionId: string | null;
}

/**
 * State of the coordinator SharedWorker
 */
export interface CoordinatorState {
	tabs: Map<string, TabConnection>;
	activeTabId: string | null;
	initialized: boolean;
	version: string | null;
	/** Base URL for REST API calls (e.g., http://localhost:5678) */
	baseUrl: string | null;
	/** CRDT subscriptions by tabId */
	crdtSubscriptions: Map<string, CRDTSubscription>;
	/** CRDT documents by docId (source of truth in worker mode) */
	crdtDocuments: Map<string, CRDTDocumentState>;
	/** CRDT execution documents by docId (exec-{workflowId}) */
	crdtExecutionDocuments: Map<string, CRDTExecutionDocumentState>;
	/** CRDT provider instance */
	crdtProvider: CRDTProvider | null;
	/**
	 * Global node types cache shared by all documents.
	 * Loaded once from SQLite after loadNodeTypes completes.
	 */
	nodeTypes: Map<string, INodeTypeDescription> | null;
	/**
	 * Promise that resolves when node types are loaded.
	 * Used by seedDocument to wait for node types before computing handles.
	 */
	nodeTypesPromise: Promise<void> | null;
	/**
	 * Resolver for nodeTypesPromise.
	 * Called by loadNodeTypes when node types are ready.
	 */
	nodeTypesResolver: (() => void) | null;
}

/**
 * Information about the coordinator state (for debugging)
 */
export interface CoordinatorInfo {
	activeTabId: string | null;
	tabCount: number;
	isInitialized: boolean;
}

/**
 * Message types for worker communication
 */
export type WorkerMessageType = 'connect' | 'disconnect' | 'query' | 'exec' | 'result' | 'error';

export interface WorkerMessage {
	type: WorkerMessageType;
	payload?: unknown;
	port?: MessagePort;
}

/**
 * Request to resolve an arbitrary expression for autocomplete.
 * The coordinator resolves using its synced Workflow instance.
 */
export interface ResolveExpressionRequest {
	type: 'resolveExpression';
	requestId: string;
	workflowId: string;
	expression: string;
	nodeName: string;
}

/**
 * Response with the resolved expression value.
 */
export interface ResolveExpressionResponse {
	type: 'resolveExpressionResult';
	requestId: string;
	result: {
		resolved: unknown;
		error?: string;
	};
}
