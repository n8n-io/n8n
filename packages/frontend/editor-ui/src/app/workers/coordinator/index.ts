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
	crdtPort: MessagePort | null;
} = {
	tabId: null,
	isRegistered: false,
	crdtPort: null,
};

/**
 * Register this tab with the coordinator
 * This should be called once when the app initializes
 */
export async function registerTab(): Promise<string> {
	if (tabState.isRegistered && tabState.tabId) {
		return tabState.tabId;
	}

	// Create a MessageChannel to pass the data worker to the coordinator
	const dataWorkerChannel = new MessageChannel();

	// Connect one end to the data worker
	// The data worker will expose its API on this port via its onmessage handler
	dataWorker.postMessage({ type: 'connect', port: dataWorkerChannel.port1 }, [
		dataWorkerChannel.port1,
	]);

	// Create a MessageChannel for CRDT binary messages
	// This port is established once during registration, not on-demand
	const crdtChannel = new MessageChannel();
	tabState.crdtPort = crdtChannel.port1; // Keep locally
	tabState.crdtPort.start();

	// Register with the coordinator, passing both ports
	const newTabId = await coordinator.registerTab(
		Comlink.transfer(dataWorkerChannel.port2, [dataWorkerChannel.port2]),
		Comlink.transfer(crdtChannel.port2, [crdtChannel.port2]),
	);
	tabState.tabId = newTabId;
	tabState.isRegistered = true;

	// Set up cleanup on page unload
	setupCleanupHandlers();

	return newTabId;
}

/**
 * Unregister the current tab and reset state
 */
function unregisterCurrentTab(): void {
	if (tabState.tabId) {
		void coordinator.unregisterTab(tabState.tabId);
		tabState.isRegistered = false;
		tabState.tabId = null;
		if (tabState.crdtPort) {
			tabState.crdtPort.close();
			tabState.crdtPort = null;
		}
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
			void registerTab();
		}
	});

	// Re-register when page becomes visible again (e.g., on mobile after switching apps)
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && !tabState.isRegistered) {
			void registerTab();
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
 * Get the CRDT MessagePort for this tab.
 * The port is established during registration, not on-demand.
 * Returns null if the tab is not registered yet.
 */
export function getCrdtPort(): MessagePort | null {
	return tabState.crdtPort;
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

/**
 * Execute a workflow using the Coordinator's synced Workflow instance.
 *
 * The Coordinator has an up-to-date Workflow instance that's kept in sync
 * with the CRDT document. This function:
 * 1. Connects to the push endpoint (gets a pushRef)
 * 2. Calls the execution API with the workflow data and pushRef
 * 3. Receives execution updates via push (logged to console)
 *
 * @param workflowId - The workflow ID to execute
 * @param baseUrl - The base URL for API and push endpoints
 * @param triggerNodeName - Optional trigger node to start from
 * @returns The execution ID if successful, null otherwise
 */
export async function executeWorkflow(
	workflowId: string,
	baseUrl: string,
	triggerNodeName?: string,
): Promise<string | null> {
	return await coordinator.executeWorkflow(workflowId, baseUrl, triggerNodeName);
}

/**
 * Resolve an expression for autocomplete purposes.
 *
 * The Coordinator has the synced Workflow instance and execution data.
 * This function resolves arbitrary expressions on-demand for autocomplete.
 *
 * @param workflowId - The workflow ID
 * @param expression - The expression to resolve (e.g., "={{ $json }}")
 * @param nodeName - The node context for resolution
 * @returns The resolved value, or null if resolution fails
 */
export async function resolveExpression(
	workflowId: string,
	expression: string,
	nodeName: string,
): Promise<unknown> {
	return await coordinator.resolveExpression(workflowId, expression, nodeName);
}

// Re-export types
export type { CoordinatorApi } from './worker';
