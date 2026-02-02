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

import { coordinator, registerTab, getCrdtPort as getCoordinatorCrdtPort } from './coordinator';
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
 *
 * @param options.version - The current n8n version from settings
 * @param options.baseUrl - The base URL for REST API calls (e.g., http://localhost:5678)
 */
export async function initialize({
	version,
	baseUrl,
}: {
	version: string;
	baseUrl: string;
}): Promise<void> {
	await ensureRegistered();
	await coordinator.initialize({ version, baseUrl });
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

/**
 * Store the n8n version in the database
 */
export async function storeVersion(version: string): Promise<void> {
	await ensureRegistered();
	await coordinator.storeVersion(version);
}

/**
 * Get the stored n8n version from the database
 */
export async function getStoredVersion(): Promise<string | null> {
	await ensureRegistered();
	return await coordinator.getStoredVersion();
}

/**
 * Get a MessagePort for CRDT binary messages (Worker Mode).
 *
 * This returns a MessagePort that uses the same binary protocol as the
 * existing CRDT SharedWorker, allowing the WorkerTransport to work unchanged.
 *
 * The Coordinator SharedWorker acts as the local CRDT server:
 * - Holds CRDT documents in memory (source of truth)
 * - Computes handles on parameter changes
 * - Broadcasts updates to all subscribed tabs
 *
 * The port is established once during tab registration, not on-demand.
 * This ensures all CRDT documents in the same tab share the same port.
 *
 * @returns A MessagePort for CRDT binary messages
 */
export async function getCrdtPort(): Promise<MessagePort> {
	await ensureRegistered();
	const port = getCoordinatorCrdtPort();
	if (!port) {
		throw new Error('CRDT port not initialized');
	}
	return port;
}
