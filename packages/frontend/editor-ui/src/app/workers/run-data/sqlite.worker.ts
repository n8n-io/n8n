/**
 * Dedicated SQLite Worker
 *
 * This worker handles the actual SQLite/OPFS operations.
 * It uses wa-sqlite with AccessHandlePoolVFS which works without cross-origin isolation.
 *
 * Architecture (based on Notion's approach):
 * - Only ONE dedicated worker should access the database at a time
 * - The SharedWorker coordinates which tab is "active"
 * - All queries are routed through the SharedWorker to the active tab's dedicated worker
 */

import * as Comlink from 'comlink';
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';
import { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';
import { getAllTableSchemas } from './db';

export interface SqliteWorkerState {
	initialized: boolean;
	sqlite3: SQLiteAPI | null;
	db: number | null;
	vfs: AccessHandlePoolVFS | null;
}

export type SQLiteAPI = ReturnType<typeof SQLite.Factory>;

export interface QueryResult {
	columns: string[];
	rows: unknown[][];
}

const state: SqliteWorkerState = {
	initialized: false,
	sqlite3: null,
	db: null,
	vfs: null,
};

const DB_NAME = 'n8n';
const VFS_NAME = 'n8n-opfs';

/**
 * Initialize the SQLite database with OPFS persistence
 */
async function initialize(): Promise<void> {
	if (state.initialized) {
		console.log('[SQLite Worker] Already initialized');
		return;
	}

	console.log('[SQLite Worker] Initializing...');

	try {
		// Load the wa-sqlite module
		const module = await SQLiteESMFactory();
		state.sqlite3 = SQLite.Factory(module);

		// Create the AccessHandlePoolVFS for OPFS persistence
		// This VFS works without SharedArrayBuffer/cross-origin isolation
		state.vfs = await AccessHandlePoolVFS.create(VFS_NAME, module);

		// Register the VFS with SQLite
		state.sqlite3.vfs_register(state.vfs, true);

		// Open the database
		state.db = await state.sqlite3.open_v2(
			DB_NAME,
			SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE,
			VFS_NAME,
		);

		console.log('[SQLite Worker] Database opened successfully');
		console.log('[SQLite Worker] SQLite version:', SQLite.sqlite3_libversion());

		// Create tables from schema
		console.log('[SQLite Worker] Creating tables...');
		const tableSchemas = getAllTableSchemas();
		for (const schema of tableSchemas) {
			await state.sqlite3.exec(state.db, schema);
		}
		console.log('[SQLite Worker] Tables created successfully');

		state.initialized = true;
	} catch (error) {
		console.error('[SQLite Worker] Failed to initialize:', error);
		throw error;
	}
}

/**
 * Execute a SQL statement (for INSERT, UPDATE, DELETE, CREATE, etc.)
 */
async function exec(sql: string): Promise<void> {
	if (!state.sqlite3 || state.db === null) {
		throw new Error('[SQLite Worker] Database not initialized');
	}

	console.log(
		'[SQLite Worker] Executing:',
		sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
	);

	await state.sqlite3.exec(state.db, sql);
}

/**
 * Execute a SQL query and return results (for SELECT)
 */
async function query(sql: string): Promise<QueryResult> {
	if (!state.sqlite3 || state.db === null) {
		throw new Error('[SQLite Worker] Database not initialized');
	}

	console.log('[SQLite Worker] Querying:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));

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
 */
async function queryWithParams(sql: string, params: unknown[]): Promise<QueryResult> {
	if (!state.sqlite3 || state.db === null) {
		throw new Error('[SQLite Worker] Database not initialized');
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
		throw new Error('[SQLite Worker] Failed to prepare statement');
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
 */
async function close(): Promise<void> {
	if (state.sqlite3 && state.db !== null) {
		console.log('[SQLite Worker] Closing database...');
		await state.sqlite3.close(state.db);
		state.db = null;
	}

	if (state.vfs) {
		await state.vfs.close();
		state.vfs = null;
	}

	state.initialized = false;
	console.log('[SQLite Worker] Database closed');
}

/**
 * Check if the worker is initialized
 */
function isInitialized(): boolean {
	return state.initialized;
}

// Export the worker API
export const sqliteWorkerApi = {
	initialize,
	exec,
	query,
	queryWithParams,
	close,
	isInitialized,
};

export type SqliteWorkerApi = typeof sqliteWorkerApi;

// Expose the API via Comlink for direct communication
Comlink.expose(sqliteWorkerApi);

// Also handle MessageChannel connections from the coordinator
self.onmessage = (event: MessageEvent) => {
	if (event.data?.type === 'connect' && event.data.port instanceof MessagePort) {
		console.log('[SQLite Worker] Received connection from coordinator');
		// Expose the API on the provided port for the coordinator to use
		Comlink.expose(sqliteWorkerApi, event.data.port);
	}
};
