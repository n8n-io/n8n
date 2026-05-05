/**
 * Query Routing Operations
 *
 * This module provides operations for routing database queries
 * through the coordinator to the active tab's data worker.
 */

import type { QueryResult, SQLiteParam } from '../../data/types';
import type { CoordinatorState } from '../types';
import { withActiveWorker } from '../utils';

/**
 * Execute a SQL statement (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param sql - The SQL statement to execute
 */
export const exec = withActiveWorker(async (worker, sql: string) => await worker.exec(sql));

/**
 * Execute a SQL query (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param sql - The SQL query to execute
 * @returns Query result with columns and rows
 */
export const query = withActiveWorker(
	async (worker, sql: string): Promise<QueryResult> => await worker.query(sql),
);

/**
 * Execute a SQL query with parameters (routes to active tab's worker)
 *
 * @param state - The coordinator state
 * @param sql - The SQL query to execute
 * @param params - The parameters to bind to the query
 * @returns Query result with columns and rows
 */
export const queryWithParams = withActiveWorker(
	async (worker, sql: string, params: SQLiteParam[] = []): Promise<QueryResult> =>
		await worker.queryWithParams(sql, params),
);

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
