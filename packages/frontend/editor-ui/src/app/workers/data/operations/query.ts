/**
 * Database Operations
 *
 * This module provides shared database operations that can be used
 * across different modules in the data worker. It accepts the worker
 * state as a parameter to keep the code modular and testable.
 *
 * @note wa-sqlite namespace import for SQLite constants (SQLITE_ROW, SQLITE_INTEGER, etc.)
 * @docs https://github.com/rhashimoto/wa-sqlite#api
 */

import * as SQLite from 'wa-sqlite';
import type { DataWorkerState, QueryResult, SQLiteParam } from '../types';

export type { QueryResult, SQLiteParam };

/**
 * Execute a SQL statement (for INSERT, UPDATE, DELETE, CREATE, etc.)
 *
 * @param state - The data worker state
 * @param sql - The SQL statement to execute
 */
export async function exec(state: DataWorkerState, sql: string): Promise<void> {
	console.log('[DataWorker] Executing:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));

	if (!state.sqlite3 || state.db === null) {
		throw new Error('[DataWorker] Database not initialized');
	}
	await state.sqlite3.exec(state.db, sql);
}

/**
 * Execute a SQL query and return results (for SELECT)
 *
 * @param state - The data worker state
 * @param sql - The SQL query to execute
 * @returns Query result with columns and rows
 */
export async function query(state: DataWorkerState, sql: string): Promise<QueryResult> {
	console.log('[DataWorker] Querying:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
	return await queryWithParams(state, sql);
}

/**
 * Execute a SQL statement with bound parameters (for INSERT, UPDATE, DELETE)
 *
 * Uses wa-sqlite's statements() generator and bind_collection() for parameter binding.
 * @see https://github.com/rhashimoto/wa-sqlite#api
 *
 * @param state - The data worker state
 * @param sql - The SQL statement to execute
 * @param params - The parameters to bind to the statement
 */
export async function execWithParams(
	state: DataWorkerState,
	sql: string,
	params: SQLiteParam[] = [],
): Promise<void> {
	if (!state.sqlite3 || state.db === null) {
		throw new Error('[DataWorker] Database not initialized');
	}

	// Use statements() generator to get prepared statement
	for await (const stmt of state.sqlite3.statements(state.db, sql)) {
		// Bind parameters using bind_collection (handles arrays automatically)
		if (params.length > 0) {
			state.sqlite3.bind_collection(stmt, params);
		}

		// Execute the statement
		await state.sqlite3.step(stmt);
	}
}

/**
 * Execute a SQL query with bound parameters
 *
 * Uses wa-sqlite's statements() generator and bind_collection() for parameter binding.
 * The column() method automatically returns typed values.
 * @see https://github.com/rhashimoto/wa-sqlite#api
 *
 * @param state - The data worker state
 * @param sql - The SQL query to execute
 * @param params - The parameters to bind to the query
 * @returns Query result with columns and rows
 */
export async function queryWithParams(
	state: DataWorkerState,
	sql: string,
	params: SQLiteParam[] = [],
): Promise<QueryResult> {
	if (!state.sqlite3 || state.db === null) {
		throw new Error('[DataWorker] Database not initialized');
	}

	const result: QueryResult = {
		columns: [],
		rows: [],
	};

	// Use statements() generator to get prepared statement
	for await (const stmt of state.sqlite3.statements(state.db, sql)) {
		// Bind parameters using bind_collection (handles arrays automatically)
		if (params.length > 0) {
			state.sqlite3.bind_collection(stmt, params);
		}

		// Get column names
		const columnCount = state.sqlite3.column_count(stmt);
		for (let i = 0; i < columnCount; i++) {
			result.columns.push(state.sqlite3.column_name(stmt, i));
		}

		// Execute and fetch rows
		while ((await state.sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
			const row: unknown[] = [];
			for (let i = 0; i < columnCount; i++) {
				// column() returns automatically typed values (string, number, null, or Uint8Array)
				row.push(state.sqlite3.column(stmt, i));
			}
			result.rows.push(row);
		}
	}

	return result;
}

/**
 * Execute operations within a transaction
 *
 * Automatically handles BEGIN/COMMIT/ROLLBACK. On success, commits the transaction.
 * On error, rolls back and re-throws the error.
 *
 * @param state - The data worker state
 * @param fn - Async function containing operations to execute within the transaction
 * @returns The result of the callback function
 */
export async function withTrx<T>(state: DataWorkerState, fn: () => Promise<T>): Promise<T> {
	await exec(state, 'BEGIN TRANSACTION');
	try {
		const result = await fn();
		await exec(state, 'COMMIT');
		return result;
	} catch (error) {
		await exec(state, 'ROLLBACK');
		throw error;
	}
}

/**
 * Close the database connection
 *
 * @param state - The data worker state
 */
export async function close(state: DataWorkerState): Promise<void> {
	console.log('[DataWorker] Closing database...');

	if (state.sqlite3 && state.db !== null) {
		await state.sqlite3.close(state.db);
		state.db = null;
	}

	if (state.vfs) {
		await state.vfs.close();
		state.vfs = null;
	}

	state.initialized = false;

	console.log('[DataWorker] Database closed');
}
