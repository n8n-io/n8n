/**
 * Data Worker Types
 *
 * This module defines shared types used across the data worker modules.
 * It's separated to avoid circular dependencies between modules.
 */

import type * as SQLite from 'wa-sqlite';
import type { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';

/**
 * SQLite API type from wa-sqlite
 */
export type SQLiteAPI = ReturnType<typeof SQLite.Factory>;

/**
 * Data Worker State
 *
 * Represents the internal state of the data worker including
 * SQLite connection and VFS references.
 */
export interface DataWorkerState {
	initialized: boolean;
	sqlite3: SQLiteAPI | null;
	db: number | null;
	vfs: AccessHandlePoolVFS | null;
}

/**
 * Query Result
 *
 * Represents the result of a SQL query with column names and row data.
 */
export interface QueryResult {
	columns: string[];
	rows: unknown[][];
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
