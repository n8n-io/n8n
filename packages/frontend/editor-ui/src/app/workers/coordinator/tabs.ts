/**
 * Tab Management Operations
 *
 * This module provides operations for managing tab connections
 * in the coordinator SharedWorker.
 */

import * as Comlink from 'comlink';
import type { DataWorkerApi } from '../data/worker';
import type { CoordinatorState, TabConnection } from './types';

/**
 * Generate a unique tab ID
 */
export function generateTabId(): string {
	return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the active tab's data worker
 *
 * @param state - The coordinator state
 * @returns The active tab's data worker or null if no active tab
 */
export function getActiveDataWorker(state: CoordinatorState): Comlink.Remote<DataWorkerApi> | null {
	if (!state.activeTabId) return null;
	const tab = state.tabs.get(state.activeTabId);
	return tab?.dataWorker ?? null;
}

/**
 * Get the active data worker, throwing if not available
 *
 * @param state - The coordinator state
 * @returns The active tab's data worker
 * @throws Error if no active data worker is available
 */
export function getRequiredActiveDataWorker(
	state: CoordinatorState,
): Comlink.Remote<DataWorkerApi> {
	const worker = getActiveDataWorker(state);
	if (!worker) {
		throw new Error('[Coordinator] No active data worker available');
	}
	return worker;
}

/**
 * Select a new active tab when the current one disconnects
 *
 * @param state - The coordinator state
 */
export async function selectNewActiveTab(state: CoordinatorState): Promise<void> {
	// Find the first connected tab with a data worker
	for (const [tabId, tab] of state.tabs) {
		if (tab.dataWorker) {
			console.log('[Coordinator] Selecting new active tab:', tabId);
			state.activeTabId = tabId;
			tab.isActive = true;

			// Initialize the new active tab's data worker
			try {
				if (!state.version) {
					throw new Error('[Coordinator] Cannot initialize without version');
				}
				await tab.dataWorker.initialize({ version: state.version });
				state.initialized = true;
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
 *
 * @param state - The coordinator state
 * @param tabId - The ID of the disconnected tab
 */
export function handleTabDisconnect(state: CoordinatorState, tabId: string): void {
	console.log(`[Coordinator] Tab disconnected: ${tabId}`);
	const tab = state.tabs.get(tabId);

	if (tab) {
		state.tabs.delete(tabId);

		// If the disconnected tab was active, select a new one
		if (state.activeTabId === tabId) {
			state.activeTabId = null;
			state.initialized = false;
			selectNewActiveTab(state).catch(console.error);
		}
	}
}

/**
 * Register a tab and its dedicated data worker with the coordinator
 *
 * @param state - The coordinator state
 * @param dataWorkerPort - The MessagePort for communicating with the data worker
 * @returns The generated tab ID
 */
export function registerTab(state: CoordinatorState, dataWorkerPort: MessagePort): string {
	const tabId = generateTabId();
	console.log(`[Coordinator] Registering tab: ${tabId}`);

	// Wrap the data worker port with Comlink
	const dataWorker = Comlink.wrap<DataWorkerApi>(dataWorkerPort);

	const tabConnection: TabConnection = {
		id: tabId,
		port: dataWorkerPort,
		dataWorker,
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
}

/**
 * Unregister a tab when it closes
 *
 * @param state - The coordinator state
 * @param tabId - The ID of the tab to unregister
 */
export function unregisterTab(state: CoordinatorState, tabId: string): void {
	handleTabDisconnect(state, tabId);
}
