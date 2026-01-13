/**
 * SharedWorker Coordinator
 *
 * This SharedWorker coordinates which tab is "active" and routes all SQLite queries
 * to the active tab's dedicated worker. Based on Notion's architecture.
 *
 * Architecture:
 * - Each tab creates both a connection to this SharedWorker AND its own dedicated SQLite worker
 * - Only ONE tab's dedicated worker actually accesses the database at a time
 * - This SharedWorker manages which tab is "active" using Web Locks
 * - All queries from any tab are routed through here to the active tab's dedicated worker
 */

/// <reference lib="webworker" />

declare const self: SharedWorkerGlobalScope;

import * as Comlink from 'comlink';
import type { SqliteWorkerApi, QueryResult } from './sqlite.worker';

interface TabConnection {
	id: string;
	port: MessagePort;
	sqliteWorker: Comlink.Remote<SqliteWorkerApi> | null;
	isActive: boolean;
}

interface CoordinatorState {
	tabs: Map<string, TabConnection>;
	activeTabId: string | null;
	initialized: boolean;
	initPromise: Promise<void> | null;
}

const state: CoordinatorState = {
	tabs: new Map(),
	activeTabId: null,
	initialized: false,
	initPromise: null,
};

/**
 * Generate a unique tab ID
 */
function generateTabId(): string {
	return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the active tab's SQLite worker
 */
function getActiveSqliteWorker(): Comlink.Remote<SqliteWorkerApi> | null {
	if (!state.activeTabId) return null;
	const tab = state.tabs.get(state.activeTabId);
	return tab?.sqliteWorker ?? null;
}

/**
 * Select a new active tab when the current one disconnects
 */
async function selectNewActiveTab(): Promise<void> {
	// Find the first connected tab with a SQLite worker
	for (const [tabId, tab] of state.tabs) {
		if (tab.sqliteWorker) {
			console.log('[Coordinator] Selecting new active tab:', tabId);
			state.activeTabId = tabId;
			tab.isActive = true;

			// Initialize the new active tab's SQLite worker
			try {
				await tab.sqliteWorker.initialize();
				console.log(`[Coordinator] New active tab ${tabId} initialized`);
			} catch (error) {
				console.error('[Coordinator] Failed to initialize new active tab:', error);
				// Try the next tab
				tab.isActive = false;
				state.activeTabId = null;
				continue;
			}
			return;
		}
	}

	console.log('[Coordinator] No tabs available to become active');
	state.activeTabId = null;
	state.initialized = false;
}

/**
 * Handle tab disconnection
 */
function handleTabDisconnect(tabId: string): void {
	console.log(`[Coordinator] Tab disconnected: ${tabId}`);
	const tab = state.tabs.get(tabId);

	if (tab) {
		state.tabs.delete(tabId);

		// If the disconnected tab was active, select a new one
		if (state.activeTabId === tabId) {
			state.activeTabId = null;
			state.initialized = false;
			selectNewActiveTab().catch(console.error);
		}
	}
}

// ============================================================================
// Public API exposed to tabs
// ============================================================================

const coordinatorApi = {
	/**
	 * Register a tab and its dedicated SQLite worker with the coordinator
	 */
	async registerTab(sqliteWorkerPort: MessagePort): Promise<string> {
		const tabId = generateTabId();
		console.log(`[Coordinator] Registering tab: ${tabId}`);

		// Wrap the SQLite worker port with Comlink
		const sqliteWorker = Comlink.wrap<SqliteWorkerApi>(sqliteWorkerPort);

		const tabConnection: TabConnection = {
			id: tabId,
			port: sqliteWorkerPort,
			sqliteWorker,
			isActive: false,
		};

		state.tabs.set(tabId, tabConnection);

		// If this is the first tab or no active tab, make it active
		if (!state.activeTabId) {
			console.log(`[Coordinator] Making tab ${tabId} the active tab`);
			state.activeTabId = tabId;
			tabConnection.isActive = true;
		}

		return tabId;
	},

	/**
	 * Unregister a tab when it closes
	 */
	async unregisterTab(tabId: string): Promise<void> {
		handleTabDisconnect(tabId);
	},

	/**
	 * Initialize the database (routes to active tab's worker)
	 */
	async initialize(): Promise<void> {
		console.log('[Coordinator] Initialize requested');

		// Prevent concurrent initialization
		if (state.initPromise) {
			return await state.initPromise;
		}

		if (state.initialized) {
			console.log('[Coordinator] Already initialized');
			return;
		}

		state.initPromise = (async () => {
			const worker = getActiveSqliteWorker();
			if (!worker) {
				throw new Error('[Coordinator] No active SQLite worker available');
			}

			await worker.initialize();
			state.initialized = true;
			console.log('[Coordinator] Initialization complete');
		})();

		try {
			await state.initPromise;
		} finally {
			state.initPromise = null;
		}
	},

	/**
	 * Execute a SQL statement (routes to active tab's worker)
	 */
	async exec(sql: string): Promise<void> {
		const worker = getActiveSqliteWorker();
		if (!worker) {
			throw new Error('[Coordinator] No active SQLite worker available');
		}

		if (!state.initialized) {
			await coordinatorApi.initialize();
		}

		await worker.exec(sql);
	},

	/**
	 * Execute a SQL query (routes to active tab's worker)
	 */
	async query(sql: string): Promise<QueryResult> {
		const worker = getActiveSqliteWorker();
		if (!worker) {
			throw new Error('[Coordinator] No active SQLite worker available');
		}

		if (!state.initialized) {
			await coordinatorApi.initialize();
		}

		return await worker.query(sql);
	},

	/**
	 * Execute a SQL query with parameters (routes to active tab's worker)
	 */
	async queryWithParams(sql: string, params: unknown[]): Promise<QueryResult> {
		const worker = getActiveSqliteWorker();
		if (!worker) {
			throw new Error('[Coordinator] No active SQLite worker available');
		}

		if (!state.initialized) {
			await coordinatorApi.initialize();
		}

		return await worker.queryWithParams(sql, params);
	},

	/**
	 * Check if the coordinator is initialized
	 */
	isInitialized(): boolean {
		return state.initialized;
	},

	/**
	 * Get the current active tab ID
	 */
	getActiveTabId(): string | null {
		return state.activeTabId;
	},

	/**
	 * Get the number of connected tabs
	 */
	getTabCount(): number {
		return state.tabs.size;
	},
};

export type CoordinatorApi = typeof coordinatorApi;

// ============================================================================
// SharedWorker connection handling
// ============================================================================

const ports = new Set<MessagePort>();

self.onconnect = (e: MessageEvent) => {
	const port = e.ports[0];
	ports.add(port);

	// Track which tab this port belongs to
	let connectedTabId: string | null = null;

	// Create a wrapped API that tracks the tab ID on registration
	const wrappedApi = {
		...coordinatorApi,
		async registerTab(sqliteWorkerPort: MessagePort): Promise<string> {
			connectedTabId = await coordinatorApi.registerTab(sqliteWorkerPort);
			return connectedTabId;
		},
	};

	// Handle port close/disconnect
	port.onmessageerror = () => {
		ports.delete(port);
		if (connectedTabId) {
			handleTabDisconnect(connectedTabId);
		}
	};

	Comlink.expose(wrappedApi, port);
};
