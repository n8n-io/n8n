/**
 * Dedicated Data Worker
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

// wa-sqlite imports - see: https://github.com/rhashimoto/wa-sqlite#api
// SQLiteESMFactory: WebAssembly module factory for SQLite
// SQLite namespace: Contains Factory function and SQLite constants (SQLITE_OK, SQLITE_OPEN_*, etc.)
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';
import { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';
import { getAllTableSchemas } from './db';
import { loadNodeTypes as loadNodeTypesOp } from './operations/loadNodeTypes';
import {
	exec as execOp,
	query as queryOp,
	queryWithParams as queryWithParamsOp,
	close as closeOp,
} from './operations/query';
import {
	storeVersion as storeVersionOp,
	getStoredVersion as getStoredVersionOp,
} from './operations/storeVersion';
import type { DataWorkerState, QueryResult, SQLiteAPI, SQLiteParam } from './types';

export type { DataWorkerState, QueryResult, SQLiteAPI, SQLiteParam } from './types';

const state: DataWorkerState = {
	initialized: false,
	sqlite3: null,
	db: null,
	vfs: null,
	initPromise: null,
	version: null,
};

const DB_NAME = 'n8n';
const VFS_NAME = 'n8n-opfs';
const SQLITE_ACCESS_EXISTS =
	(SQLite as { SQLITE_ACCESS_EXISTS?: number }).SQLITE_ACCESS_EXISTS ?? 0;

/**
 * Check if OPFS is available in the current environment
 */
async function isOpfsAvailable(): Promise<boolean> {
	try {
		if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
			return false;
		}
		const root = await navigator.storage.getDirectory();
		return root !== null && root !== undefined;
	} catch {
		return false;
	}
}

/**
 * Determine if the database file already exists within the AccessHandlePoolVFS directory
 */
function databaseAlreadyExists(): boolean {
	const vfs = state.vfs;
	if (!vfs) {
		return false;
	}

	const resultView = new DataView(new ArrayBuffer(4));
	const rc = vfs.jAccess(DB_NAME, SQLITE_ACCESS_EXISTS, resultView);

	if (rc !== SQLite.SQLITE_OK) {
		console.warn('[DataWorker] Unable to check database existence via VFS, assuming new database');
		return false;
	}

	return resultView.getInt32(0, true) === 1;
}

/**
 * Initialize the SQLite database with OPFS persistence
 *
 * @param options.version - The current n8n version from settings
 */
async function initialize({ version }: { version: string }): Promise<void> {
	// Return cached promise if initialization is already in progress
	if (state.initPromise) {
		return await state.initPromise;
	}

	if (state.initialized) {
		console.log('[DataWorker] Already initialized');
		return;
	}

	console.log('[DataWorker] Initializing...');

	state.initPromise = (async () => {
		const opfsAvailable = await isOpfsAvailable();
		console.log('[DataWorker] OPFS available:', opfsAvailable);
		console.log(
			'[DataWorker] Storage API:',
			typeof navigator !== 'undefined' && !!navigator.storage,
		);
		console.log(
			'[DataWorker] getDirectory method:',
			typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory,
		);

		if (!opfsAvailable) {
			console.warn(
				'[DataWorker] OPFS is not available - database will not persist across sessions',
			);
		}

		const module = await SQLiteESMFactory();
		state.sqlite3 = SQLite.Factory(module) as SQLiteAPI;

		console.log('[DataWorker] Creating AccessHandlePoolVFS...');
		state.vfs = await AccessHandlePoolVFS.create(VFS_NAME, module);
		console.log('[DataWorker] AccessHandlePoolVFS created successfully');

		state.sqlite3.vfs_register(state.vfs, true);

		const databaseExists = databaseAlreadyExists();
		console.log('[DataWorker] Database exists:', databaseExists);

		const openFlags = SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE;
		state.db = await state.sqlite3.open_v2(DB_NAME, openFlags, VFS_NAME);

		console.log('[DataWorker] Database opened successfully');
		console.log('[DataWorker] SQLite version:', state.sqlite3.libversion());
		console.log('[DataWorker] VFS name:', VFS_NAME);
		console.log('[DataWorker] Database name:', DB_NAME);

		if (!databaseExists) {
			console.log('[DataWorker] Creating tables...');
			const tableSchemas = getAllTableSchemas();
			for (const schema of tableSchemas) {
				await state.sqlite3.exec(state.db, schema);
			}
			console.log('[DataWorker] Tables created successfully');
		} else {
			console.log('[DataWorker] Skipping table creation - database already exists');
		}

		state.initialized = true;
		state.version = version;
	})();

	try {
		await state.initPromise;
	} catch (error) {
		console.error('[DataWorker] Failed to initialize:', error);
		throw error;
	} finally {
		state.initPromise = null;
	}
}

/**
 * Execute a SQL statement (for INSERT, UPDATE, DELETE, CREATE, etc.)
 */
async function exec(sql: string): Promise<void> {
	await execOp(state, sql);
}

/**
 * Execute a SQL query and return results (for SELECT)
 */
async function query(sql: string): Promise<QueryResult> {
	return await queryOp(state, sql);
}

/**
 * Execute a SQL query with bound parameters
 */
async function queryWithParams(sql: string, params: SQLiteParam[] = []): Promise<QueryResult> {
	return await queryWithParamsOp(state, sql, params);
}

/**
 * Close the database connection
 */
async function close(): Promise<void> {
	await closeOp(state);
}

/**
 * Check if the worker is initialized
 */
function isInitialized(): boolean {
	return state.initialized;
}

/**
 * Load node types from the server and sync with the local database
 * This runs entirely within the worker (fetch + SQL operations)
 */
async function loadNodeTypes(baseUrl: string): Promise<void> {
	await loadNodeTypesOp(state, baseUrl);
}

/**
 * Store the n8n version in the database
 */
async function storeVersion(version: string): Promise<void> {
	await storeVersionOp(state, version);
}

/**
 * Get the stored n8n version from the database
 */
async function getStoredVersion(): Promise<string | null> {
	return await getStoredVersionOp(state);
}

// Export the worker API
export const dataWorkerApi = {
	initialize,
	exec,
	query,
	queryWithParams,
	close,
	isInitialized,
	loadNodeTypes,
	storeVersion,
	getStoredVersion,
};

export type DataWorkerApi = typeof dataWorkerApi;

// Expose the API via Comlink for direct communication
Comlink.expose(dataWorkerApi);

// Also handle MessageChannel connections from the coordinator
self.onmessage = (event: MessageEvent) => {
	if (event.data?.type === 'connect' && event.data.port instanceof MessagePort) {
		console.log('[DataWorker] Received connection from coordinator');
		Comlink.expose(dataWorkerApi, event.data.port);
	}
};
