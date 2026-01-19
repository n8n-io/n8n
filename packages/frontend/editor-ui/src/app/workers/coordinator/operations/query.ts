/**
 * Query Routing Operations
 *
 * This module provides operations for routing database queries
 * through the coordinator to the active tab's data worker.
 */

import type { QueryResult } from '../../data/types';
import type { CoordinatorState } from '../types';
import { getActiveDataWorker } from './tabs';

/**
 * Ensure the coordinator is initialized before performing operations
 *
 * @param state - The coordinator state
 * @param initializeFn - Function to initialize the coordinator
 */
export async function ensureInitialized(
	state: CoordinatorState,
	initializeFn: () => Promise<void>,
): Promise<void> {
	if (!state.initialized) {
		await initializeFn();
	}
}

/**
 * Initialize the database (routes to active tab's worker)
 *
 * Keeps initPromise around after successful initialization so subsequent
 * calls return the same resolved promise. Clears it on failure to allow retry.
 *
 * @param state - The coordinator state
 */
export async function initialize(state: CoordinatorState): Promise<void> {
	console.log('[Coordinator] Initialize requested');

	// Return existing promise if initialization is in progress or complete
	if (state.initPromise) {
		return await state.initPromise;
	}

	state.initPromise = (async () => {
		const worker = getActiveDataWorker(state);
		if (!worker) {
			throw new Error('[Coordinator] No active data worker available');
		}

		await worker.initialize();
		state.initialized = true;
		console.log('[Coordinator] Initialization complete');
	})();

	try {
		await state.initPromise;
	} catch (error) {
		// Clear promise on failure to allow retry
		state.initPromise = null;
		throw error;
	}
}

/**
 * Execute a SQL statement (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param sql - The SQL statement to execute
 */
export async function exec(state: CoordinatorState, sql: string): Promise<void> {
	await ensureInitialized(state, async () => await initialize(state));

	const worker = getActiveDataWorker(state);
	if (!worker) {
		throw new Error('[Coordinator] No active data worker available');
	}

	await worker.exec(sql);
}

/**
 * Execute a SQL query (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param sql - The SQL query to execute
 * @returns Query result with columns and rows
 */
export async function query(state: CoordinatorState, sql: string): Promise<QueryResult> {
	await ensureInitialized(state, async () => await initialize(state));

	const worker = getActiveDataWorker(state);
	if (!worker) {
		throw new Error('[Coordinator] No active data worker available');
	}

	return await worker.query(sql);
}

/**
 * Execute a SQL query with parameters (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param sql - The SQL query to execute
 * @param params - The parameters to bind to the query
 * @returns Query result with columns and rows
 */
export async function queryWithParams(
	state: CoordinatorState,
	sql: string,
	params: unknown[] = [],
): Promise<QueryResult> {
	await ensureInitialized(state, async () => await initialize(state));

	const worker = getActiveDataWorker(state);
	if (!worker) {
		throw new Error('[Coordinator] No active data worker available');
	}

	return await worker.queryWithParams(sql, params);
}

/**
 * Check if the coordinator is initialized
 *
 * @param state - The coordinator state
 * @returns Whether the coordinator is initialized
 */
export function isInitialized(state: CoordinatorState): boolean {
	return state.initialized;
}

/**
 * Get the current active tab ID
 *
 * @param state - The coordinator state
 * @returns The active tab ID or null
 */
export function getActiveTabId(state: CoordinatorState): string | null {
	return state.activeTabId;
}

/**
 * Get the number of connected tabs
 *
 * @param state - The coordinator state
 * @returns The number of connected tabs
 */
export function getTabCount(state: CoordinatorState): number {
	return state.tabs.size;
}
