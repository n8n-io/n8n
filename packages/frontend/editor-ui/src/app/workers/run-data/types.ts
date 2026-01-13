/**
 * Type definitions for the run-data workers
 *
 * This module contains shared type definitions used across
 * the coordinator (SharedWorker), SQLite worker (Dedicated Worker),
 * and the main thread instance.
 */

/**
 * Result from a SQL query
 */
export interface QueryResult {
	columns: string[];
	rows: unknown[][];
}

/**
 * State of the SQLite dedicated worker
 */
export interface SqliteWorkerState {
	initialized: boolean;
	db: number | null;
	vfs: unknown | null;
}

/**
 * State of the coordinator SharedWorker
 */
export interface CoordinatorState {
	tabs: Map<string, TabConnection>;
	activeTabId: string | null;
	initialized: boolean;
	initPromise: Promise<void> | null;
}

/**
 * Represents a connected tab in the coordinator
 */
export interface TabConnection {
	id: string;
	port: MessagePort;
	sqliteWorker: unknown | null;
	isActive: boolean;
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
 * Database table row types
 */
export interface ExecutionRow {
	id: string;
	workflow_id: string;
	data: string;
	workflow: string;
	created_at: string;
}

export interface NodeTypeRow {
	id: string;
	data: string;
	updated_at: string;
}

export interface CredentialRow {
	id: string;
	data: string;
	updated_at: string;
}

export interface WorkflowRow {
	id: string;
	data: string;
	updated_at: string;
}
