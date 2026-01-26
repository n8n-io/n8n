/**
 * Coordinator Types
 *
 * This module defines types used by the coordinator SharedWorker.
 * These types are specific to the coordination layer that manages
 * which tab's dedicated worker is active.
 */

import type * as Comlink from 'comlink';
import type { CRDTDoc, CRDTProvider, Unsubscribe } from '@n8n/crdt';
import type { INodeTypeDescription, Workflow } from 'n8n-workflow';

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
 * CRDT document state held by the coordinator
 */
export interface CRDTDocumentState {
	/** CRDT document (source of truth in worker mode) */
	doc: CRDTDoc;
	/** Workflow instance for handle computation */
	workflow: Workflow | null;
	/** Node types cache for handle computation */
	nodeTypes: Map<string, INodeTypeDescription>;
	/** Unsubscribe function for workflow sync observer */
	syncUnsub: Unsubscribe | null;
	/** Unsubscribe function for handle recomputation observer */
	handleObserverUnsub: Unsubscribe | null;
	/** Whether the document has been seeded with initial data */
	seeded: boolean;
	/** Base URL for REST API calls */
	baseUrl: string;
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
