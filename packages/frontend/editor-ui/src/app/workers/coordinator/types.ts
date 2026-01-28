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
	/** Node types cache for handle computation (worker mode only) */
	nodeTypes: Map<string, INodeTypeDescription>;
	/** Unsubscribe function for handle recomputation observer (worker mode only) */
	handleObserverUnsub: Unsubscribe | null;
	/** Whether the document has been seeded with initial data (worker mode only) */
	seeded: boolean;
	/** Base URL for REST API calls (worker mode) or WebSocket URL (server mode) */
	baseUrl: string;
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
 * State of the coordinator SharedWorker
 */
export interface CoordinatorState {
	tabs: Map<string, TabConnection>;
	activeTabId: string | null;
	initialized: boolean;
	version: string | null;
	/** CRDT subscriptions by tabId */
	crdtSubscriptions: Map<string, CRDTSubscription>;
	/** CRDT documents by docId (source of truth in worker mode) */
	crdtDocuments: Map<string, CRDTDocumentState>;
	/** CRDT provider instance */
	crdtProvider: CRDTProvider | null;
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
