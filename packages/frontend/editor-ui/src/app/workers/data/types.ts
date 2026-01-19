/**
 * Data Worker Types
 *
 * This module defines shared types used across the data worker modules.
 * It's separated to avoid circular dependencies between modules.
 */

/// <reference types="wa-sqlite/src/types" />

// wa-sqlite imports - see: https://github.com/rhashimoto/wa-sqlite#api
import type * as SQLite from 'wa-sqlite';
import type { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';

/**
 * Prepared statement result from prepare_v2
 */
export interface SQLitePreparedStatement {
	stmt: number;
	sql: string;
}

/**
 * SQLiteAPI type derived from wa-sqlite Factory function
 * Extended with low-level methods that exist at runtime but aren't in the official types
 * @see https://github.com/rhashimoto/wa-sqlite
 */
export type SQLiteAPI = ReturnType<typeof SQLite.Factory> & {
	/**
	 * Create a new SQL string object
	 * @param db - Database pointer
	 * @param sql - SQL string
	 * @returns String pointer
	 */
	str_new(db: number, sql: string): number;

	/**
	 * Get the value pointer from a string object
	 * @param str - String pointer
	 * @returns Value pointer
	 */
	str_value(str: number): number;

	/**
	 * Finish and free a string object
	 * @param str - String pointer
	 */
	str_finish(str: number): void;

	/**
	 * Prepare a SQL statement (version 2)
	 * @param db - Database pointer
	 * @param sql - SQL string pointer
	 * @returns Prepared statement object or null
	 */
	prepare_v2(db: number, sql: number): Promise<SQLitePreparedStatement | null>;
};

/**
 * Re-export AccessHandlePoolVFS for convenience
 */
export type { AccessHandlePoolVFS };

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
	initPromise: Promise<void> | null;
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
export interface NodeTypeRow {
	id: string;
	data: string;
	updated_at: string;
}
