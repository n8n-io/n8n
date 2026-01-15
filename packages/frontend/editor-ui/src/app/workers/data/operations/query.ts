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
import type { DataWorkerState, QueryResult } from '../types';

export type { QueryResult };

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

	if (!state.sqlite3 || state.db === null) {
		throw new Error('[DataWorker] Database not initialized');
	}

	const result: QueryResult = {
		columns: [],
		rows: [],
	};

	await state.sqlite3.exec(state.db, sql, (row, columns) => {
		if (result.columns.length === 0) {
			result.columns = columns;
		}
		result.rows.push(row);
	});

	return result;
}

/**
 * Execute a SQL query with bound parameters
 *
 * @param state - The data worker state
 * @param sql - The SQL query to execute
 * @param params - The parameters to bind to the query
 * @returns Query result with columns and rows
 */
export async function queryWithParams(
	state: DataWorkerState,
	sql: string,
	params: unknown[],
): Promise<QueryResult> {
	if (!state.sqlite3 || state.db === null) {
		throw new Error('[DataWorker] Database not initialized');
	}

	const result: QueryResult = {
		columns: [],
		rows: [],
	};

	// Prepare statement
	const str = state.sqlite3.str_new(state.db, sql);
	const prepared = await state.sqlite3.prepare_v2(state.db, state.sqlite3.str_value(str));

	if (prepared === null) {
		state.sqlite3.str_finish(str);
		throw new Error('[DataWorker] Failed to prepare statement');
	}

	try {
		// Bind parameters
		for (let i = 0; i < params.length; i++) {
			const param = params[i];
			if (param === null) {
				state.sqlite3.bind_null(prepared.stmt, i + 1);
			} else if (typeof param === 'number') {
				if (Number.isInteger(param)) {
					state.sqlite3.bind_int(prepared.stmt, i + 1, param);
				} else {
					state.sqlite3.bind_double(prepared.stmt, i + 1, param);
				}
			} else if (typeof param === 'string') {
				state.sqlite3.bind_text(prepared.stmt, i + 1, param);
			} else if (param instanceof Uint8Array) {
				state.sqlite3.bind_blob(prepared.stmt, i + 1, param);
			} else {
				// Convert to JSON string for complex types
				state.sqlite3.bind_text(prepared.stmt, i + 1, JSON.stringify(param));
			}
		}

		// Get column names
		const columnCount = state.sqlite3.column_count(prepared.stmt);
		for (let i = 0; i < columnCount; i++) {
			result.columns.push(state.sqlite3.column_name(prepared.stmt, i));
		}

		// Execute and fetch rows
		while ((await state.sqlite3.step(prepared.stmt)) === SQLite.SQLITE_ROW) {
			const row: unknown[] = [];
			for (let i = 0; i < columnCount; i++) {
				const type = state.sqlite3.column_type(prepared.stmt, i);
				switch (type) {
					case SQLite.SQLITE_INTEGER:
						row.push(state.sqlite3.column_int(prepared.stmt, i));
						break;
					case SQLite.SQLITE_FLOAT:
						row.push(state.sqlite3.column_double(prepared.stmt, i));
						break;
					case SQLite.SQLITE_TEXT:
						row.push(state.sqlite3.column_text(prepared.stmt, i));
						break;
					case SQLite.SQLITE_BLOB:
						row.push(state.sqlite3.column_blob(prepared.stmt, i));
						break;
					case SQLite.SQLITE_NULL:
					default:
						row.push(null);
						break;
				}
			}
			result.rows.push(row);
		}
	} finally {
		await state.sqlite3.finalize(prepared.stmt);
		state.sqlite3.str_finish(str);
	}

	return result;
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
