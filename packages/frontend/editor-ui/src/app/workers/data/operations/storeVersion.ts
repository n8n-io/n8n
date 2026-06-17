/**
 * Store Version Operation
 *
 * This module handles storing and retrieving the n8n version
 * in the local SQLite database metadata table.
 */

import type { DataWorkerState } from '../types';
import { execWithParams, queryWithParams } from './query';

const VERSION_KEY = 'version';

/**
 * Store the n8n version in the database
 *
 * @param state - The data worker state
 * @param version - The n8n version string (e.g., "1.75.0")
 */
export async function storeVersion(state: DataWorkerState, version: string): Promise<void> {
	console.log('[DataWorker] storeVersion:', version);

	if (!state.initialized) {
		throw new Error('[DataWorker] Database not initialized');
	}

	await execWithParams(
		state,
		"INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
		[VERSION_KEY, version],
	);

	console.log('[DataWorker] Version stored successfully');
}

/**
 * Get the stored n8n version from the database
 *
 * @param state - The data worker state
 * @returns The stored version string or null if not found
 */
export async function getStoredVersion(state: DataWorkerState): Promise<string | null> {
	if (!state.initialized) {
		throw new Error('[DataWorker] Database not initialized');
	}

	const result = await queryWithParams(state, 'SELECT value FROM metadata WHERE key = ?', [
		VERSION_KEY,
	]);

	if (result.rows.length === 0) {
		return null;
	}

	return result.rows[0][0] as string;
}
