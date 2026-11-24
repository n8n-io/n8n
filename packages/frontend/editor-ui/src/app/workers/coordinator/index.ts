/**
 * Coordinator Module
 *
 * This module provides the main thread API to communicate with the
 * SharedWorker coordinator that manages tab coordination and routes
 * queries to the active data worker.
 */

import * as Comlink from 'comlink';
import type { CoordinatorApi } from './worker';

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
const tabState: {
	tabId: string | null;
	isRegistered: boolean;
} = {
	tabId: null,
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
	// The data worker will expose its API on this port via its onmessage handler
	dataWorker.postMessage({ type: 'connect', port: channel.port1 }, [channel.port1]);

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
 * Unregister the current tab and reset state
 */
function unregisterCurrentTab(): void {
	if (tabState.tabId) {
		coordinator.unregisterTab(tabState.tabId).catch(console.error);
		tabState.isRegistered = false;
		tabState.tabId = null;
	}
}

/**
 * Set up cleanup handlers for when the page unloads
 */
function setupCleanupHandlers(): void {
	window.addEventListener('beforeunload', unregisterCurrentTab);

	// Also use pagehide for mobile browsers
	window.addEventListener('pagehide', unregisterCurrentTab);

	// Re-register when page is restored from bfcache
	window.addEventListener('pageshow', (event) => {
		if (event.persisted && !tabState.isRegistered) {
			console.log('[Coordinator] Page restored from bfcache, re-registering...');
			registerTab().catch(console.error);
		}
	});

	// Re-register when page becomes visible again (e.g., on mobile after switching apps)
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && !tabState.isRegistered) {
			console.log('[Coordinator] Page became visible, re-registering...');
			registerTab().catch(console.error);
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
