/**
 * Run Data Workers
 *
 * Main entry point for the run-data worker system.
 *
 * Architecture (based on Notion's approach):
 * - Each tab creates a dedicated data worker (for actual DB operations)
 * - Each tab connects to the SharedWorker coordinator
 * - The coordinator routes all queries to the "active" tab's dedicated worker
 * - Only one dedicated worker accesses OPFS at a time (prevents corruption)
 */

import { coordinator, registerTab } from './coordinator';
import type { SQLiteParam } from './data/types';

/**
 * Ensure the tab is registered before performing operations
 */
async function ensureRegistered(): Promise<void> {
	await registerTab();
}

/**
 * Initialize the database
 * This will route to the active tab's data worker
 */
export async function initialize(): Promise<void> {
	await ensureRegistered();
	await coordinator.initialize();
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE, etc.)
 */
export async function exec(sql: string): Promise<void> {
	await ensureRegistered();
	await coordinator.exec(sql);
}

/**
 * Execute a SQL query and return results
 */
export async function query(sql: string): Promise<{ columns: string[]; rows: unknown[][] }> {
	await ensureRegistered();
	return await coordinator.query(sql);
}

/**
 * Execute a SQL query with bound parameters
 */
export async function queryWithParams(
	sql: string,
	params: SQLiteParam[],
): Promise<{ columns: string[]; rows: unknown[][] }> {
	await ensureRegistered();
	return await coordinator.queryWithParams(sql, params);
}

/**
 * Check if the database is initialized
 */
export async function isInitialized(): Promise<boolean> {
	return await coordinator.isInitialized();
}

/**
 * Load node types from the server
 */
export async function loadNodeTypes(baseUrl: string): Promise<void> {
	await ensureRegistered();
	await coordinator.loadNodeTypes(baseUrl);
}
