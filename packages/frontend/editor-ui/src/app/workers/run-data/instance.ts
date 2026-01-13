/**
 * Worker Instance Manager
 *
 * This module creates and manages the connection between the main thread,
 * the SharedWorker coordinator, and the dedicated SQLite worker.
 *
 * Architecture (based on Notion's approach):
 * - Each tab creates a dedicated SQLite worker (for actual DB operations)
 * - Each tab connects to the SharedWorker coordinator
 * - The coordinator routes all queries to the "active" tab's dedicated worker
 * - Only one dedicated worker accesses OPFS at a time (prevents corruption)
 */

import * as Comlink from 'comlink';
import type { CoordinatorApi } from './worker';
import type { SqliteWorkerApi } from './sqlite.worker';

// The SharedWorker coordinator that routes queries
const sharedWorker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
	type: 'module',
	name: 'n8n-coordinator',
});
sharedWorker.port.start();

// The dedicated SQLite worker for this tab (only used if this tab becomes active)
const sqliteWorker = new Worker(new URL('./sqlite.worker.ts', import.meta.url), {
	type: 'module',
	name: 'n8n-sqlite',
});

// Wrap the coordinator with Comlink
const coordinator = Comlink.wrap<CoordinatorApi>(sharedWorker.port);

// State
let tabId: string | null = null;
let isRegistered = false;

/**
 * Register this tab with the coordinator
 * This should be called once when the app initializes
 */
export async function registerTab(): Promise<string> {
	if (isRegistered && tabId) {
		return tabId;
	}

	console.log('[Instance] Registering tab with coordinator...');

	// Create a MessageChannel to pass the SQLite worker to the coordinator
	const channel = new MessageChannel();

	// Connect one end to the SQLite worker
	sqliteWorker.postMessage({ type: 'connect', port: channel.port1 }, [channel.port1]);

	// Expose the SQLite worker API on port1 for the coordinator to use
	// The SQLite worker will receive messages on port1 and respond
	Comlink.expose(Comlink.wrap<SqliteWorkerApi>(sqliteWorker), channel.port1);

	// Register with the coordinator, passing port2 for it to communicate with our SQLite worker
	tabId = await coordinator.registerTab(Comlink.transfer(channel.port2, [channel.port2]));
	isRegistered = true;

	console.log(`[Instance] Registered as tab: ${tabId}`);

	// Set up cleanup on page unload
	window.addEventListener('beforeunload', () => {
		if (tabId) {
			coordinator.unregisterTab(tabId).catch(console.error);
		}
	});

	// Also use pagehide for mobile browsers
	window.addEventListener('pagehide', () => {
		if (tabId) {
			coordinator.unregisterTab(tabId).catch(console.error);
		}
	});

	return tabId;
}

/**
 * Initialize the database
 * This will route to the active tab's SQLite worker
 */
export async function initialize(): Promise<void> {
	if (!isRegistered) {
		await registerTab();
	}
	await coordinator.initialize();
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
 */
export async function exec(sql: string): Promise<void> {
	if (!isRegistered) {
		await registerTab();
	}
	await coordinator.exec(sql);
}

/**
 * Execute a SQL query and return results
 */
export async function query(sql: string): Promise<{ columns: string[]; rows: unknown[][] }> {
	if (!isRegistered) {
		await registerTab();
	}
	return await coordinator.query(sql);
}

/**
 * Execute a SQL query with bound parameters
 */
export async function queryWithParams(
	sql: string,
	params: unknown[],
): Promise<{ columns: string[]; rows: unknown[][] }> {
	if (!isRegistered) {
		await registerTab();
	}
	return await coordinator.queryWithParams(sql, params);
}

/**
 * Check if the database is initialized
 */
export function isInitialized(): boolean {
	return coordinator.isInitialized();
}

/**
 * Get the current tab's ID
 */
export function getTabId(): string | null {
	return tabId;
}

/**
 * Get info about the coordinator state (for debugging)
 */
export async function getCoordinatorInfo(): Promise<{
	activeTabId: string | null;
	tabCount: number;
	isInitialized: boolean;
}> {
	return {
		activeTabId: await coordinator.getActiveTabId(),
		tabCount: await coordinator.getTabCount(),
		isInitialized: await coordinator.isInitialized(),
	};
}

// Export the coordinator for direct access if needed
export { coordinator };

// Default export for backwards compatibility
export default {
	registerTab,
	initialize,
	exec,
	query,
	queryWithParams,
	isInitialized,
	getTabId,
	getCoordinatorInfo,
};
