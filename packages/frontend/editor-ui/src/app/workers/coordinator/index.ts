/**
 * Coordinator Module
 *
 * This module provides the main thread API to communicate with the
 * SharedWorker coordinator that manages tab coordination and routes
 * queries to the active data worker.
 */

import * as Comlink from 'comlink';
import type { CoordinatorApi } from './worker';
import type { DataWorkerApi } from '../data/worker';

// The SharedWorker coordinator that routes queries
export const sharedWorker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
	type: 'module',
	name: 'n8n-coordinator',
});
sharedWorker.port.start();

// The dedicated data worker for this tab (only used if this tab becomes active)
export const dataWorker = new Worker(new URL('../data/worker.ts', import.meta.url), {
	type: 'module',
	name: 'n8n-data',
});

// Wrap the coordinator with Comlink
export const coordinator = Comlink.wrap<CoordinatorApi>(sharedWorker.port);

// State
const tabState = {
	tabId: null as string | null,
	isRegistered: false,
};

/**
 * Register this tab with the coordinator
 * This should be called once when the app initializes
 */
export async function registerTab(): Promise<string> {
	if (tabState.isRegistered && tabState.tabId) {
		return tabState.tabId;
	}

	console.log('[Coordinator] Registering tab...');

	// Create a MessageChannel to pass the data worker to the coordinator
	const channel = new MessageChannel();

	// Connect one end to the data worker
	dataWorker.postMessage({ type: 'connect', port: channel.port1 }, [channel.port1]);

	// Expose the data worker API on port1 for the coordinator to use
	Comlink.expose(Comlink.wrap<DataWorkerApi>(dataWorker), channel.port1);

	// Register with the coordinator, passing port2 for it to communicate with our data worker
	const newTabId = await coordinator.registerTab(Comlink.transfer(channel.port2, [channel.port2]));
	tabState.tabId = newTabId;
	tabState.isRegistered = true;

	console.log(`[Coordinator] Registered as tab: ${newTabId}`);

	// Set up cleanup on page unload
	setupCleanupHandlers();

	return newTabId;
}

/**
 * Set up cleanup handlers for when the page unloads
 */
function setupCleanupHandlers(): void {
	window.addEventListener('beforeunload', () => {
		if (tabState.tabId) {
			coordinator.unregisterTab(tabState.tabId).catch(console.error);
		}
	});

	// Also use pagehide for mobile browsers
	window.addEventListener('pagehide', () => {
		if (tabState.tabId) {
			coordinator.unregisterTab(tabState.tabId).catch(console.error);
		}
	});
}

/**
 * Get the current tab's ID
 */
export function getTabId(): string | null {
	return tabState.tabId;
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

// Re-export types
export type { CoordinatorApi } from './worker';
