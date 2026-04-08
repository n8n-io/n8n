/**
 * SharedWorker Coordinator
 *
 * This SharedWorker coordinates which tab is "active" and routes all queries
 * to the active tab's dedicated worker. Based on Notion's architecture.
 *
 * Architecture:
 * - Each tab creates both a connection to this SharedWorker AND its own dedicated data worker
 * - Only ONE tab's dedicated worker actually accesses the database at a time
 * - This SharedWorker manages which tab is "active" using Web Locks
 * - All queries from any tab are routed through here to the active tab's dedicated worker
 */

/// <reference lib="webworker" />

declare const self: SharedWorkerGlobalScope;

import * as Comlink from 'comlink';
import type { CoordinatorState } from './types';
import type { SQLiteParam } from '../data/types';
import {
	registerTab as registerTabOp,
	unregisterTab as unregisterTabOp,
	handleTabDisconnect,
} from './tabs';
import {
	exec as execOp,
	query as queryOp,
	queryWithParams as queryWithParamsOp,
	isInitialized as isInitializedOp,
	getActiveTabId as getActiveTabIdOp,
	getTabCount as getTabCountOp,
} from './operations/query';
import { loadNodeTypes as loadNodeTypesOp } from './operations/loadNodeTypes';
import {
	storeVersion as storeVersionOp,
	getStoredVersion as getStoredVersionOp,
} from './operations/storeVersion';
import { initialize as initializeOp } from './initialize';

const state: CoordinatorState = {
	tabs: new Map(),
	activeTabId: null,
	initialized: false,
	version: null,
};

// ============================================================================
// Public API exposed to tabs
// ============================================================================

const coordinatorApi = {
	/**
	 * Register a tab and its dedicated data worker with the coordinator
	 */
	async registerTab(dataWorkerPort: MessagePort): Promise<string> {
		return registerTabOp(state, dataWorkerPort);
	},

	/**
	 * Unregister a tab when it closes
	 */
	async unregisterTab(tabId: string): Promise<void> {
		unregisterTabOp(state, tabId);
	},

	/**
	 * Initialize the database (routes to active tab's worker)
	 *
	 * @param options.version - The current n8n version from settings
	 */
	async initialize({ version }: { version: string }): Promise<void> {
		await initializeOp(state, { version });
	},

	/**
	 * Execute a SQL statement (routes to active tab's worker)
	 */
	async exec(sql: string): Promise<void> {
		await execOp(state, sql);
	},

	/**
	 * Execute a SQL query (routes to active tab's worker)
	 */
	async query(sql: string) {
		return await queryOp(state, sql);
	},

	/**
	 * Execute a SQL query with parameters (routes to active tab's worker)
	 */
	async queryWithParams(sql: string, params: SQLiteParam[] = []) {
		return await queryWithParamsOp(state, sql, params);
	},

	/**
	 * Check if the coordinator is initialized
	 */
	isInitialized(): boolean {
		return isInitializedOp(state);
	},

	/**
	 * Get the current active tab ID
	 */
	getActiveTabId(): string | null {
		return getActiveTabIdOp(state);
	},

	/**
	 * Get the number of connected tabs
	 */
	getTabCount(): number {
		return getTabCountOp(state);
	},

	/**
	 * Load node types from the server (routes to active tab's worker)
	 */
	async loadNodeTypes(baseUrl: string): Promise<void> {
		await loadNodeTypesOp(state, baseUrl);
	},

	/**
	 * Store the n8n version (routes to active tab's worker)
	 */
	async storeVersion(version: string): Promise<void> {
		await storeVersionOp(state, version);
	},

	/**
	 * Get the stored n8n version (routes to active tab's worker)
	 */
	async getStoredVersion(): Promise<string | null> {
		return await getStoredVersionOp(state);
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
		async registerTab(dataWorkerPort: MessagePort): Promise<string> {
			connectedTabId = await coordinatorApi.registerTab(dataWorkerPort);
			return connectedTabId;
		},
	};

	// Handle port close/disconnect
	port.onmessageerror = () => {
		ports.delete(port);
		if (connectedTabId) {
			handleTabDisconnect(state, connectedTabId);
		}
	};

	Comlink.expose(wrappedApi, port);
};
