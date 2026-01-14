/**
 * Load Node Types
 *
 * This module handles loading and syncing node types from the server
 * to the local SQLite database for caching.
 *
 * The functions accept the data worker state, allowing them to be
 * called from within web workers while keeping the code modular.
 */

import { getNodeTypes, getNodeTypeVersions } from '@n8n/rest-api-client/api/nodeTypes';
import type { INodeTypeDescription } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { DataWorkerState } from '../types';
import { exec, query } from './query';

/**
 * Generate a unique ID for a node type version
 */
function getNodeTypeId(name: string, version: number): string {
	return `${name}@${version}`;
}

/**
 * Extract all version numbers from a node type description
 */
function getNodeTypeVersionsFromDescription(nodeType: INodeTypeDescription): number[] {
	const version = nodeType.version;
	if (typeof version === 'number') {
		return [version];
	}
	if (Array.isArray(version)) {
		return version;
	}
	return [1];
}

/**
 * Load node types from the server and sync with the local database
 *
 * @param state - The data worker state
 * @param baseUrl - The base URL for API requests
 */
export async function loadNodeTypes(state: DataWorkerState, baseUrl: string): Promise<void> {
	if (!state.initialized) {
		throw new Error('[DataWorker] Database not initialized');
	}

	console.log('[DataWorker] Starting node types sync...');

	// Check if the database has any node types
	const countResult = await query(state, 'SELECT COUNT(*) as count FROM nodeTypes');
	const count = countResult.rows[0]?.[0] as number;
	const isEmpty = count === 0;

	console.log(`[DataWorker] Database has ${count} node types, isEmpty: ${isEmpty}`);

	if (isEmpty) {
		// Initial load: fetch all node types and store them
		console.log('[DataWorker] Performing initial load of all node types...');
		const nodeTypes: INodeTypeDescription[] = await getNodeTypes(baseUrl);
		console.log(`[DataWorker] Fetched ${nodeTypes.length} node types from server`);

		// Use a transaction for better performance
		await exec(state, 'BEGIN TRANSACTION');

		try {
			for (const nodeType of nodeTypes) {
				const versions = getNodeTypeVersionsFromDescription(nodeType);
				for (const version of versions) {
					const id = getNodeTypeId(nodeType.name, version);
					await exec(
						state,
						`INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES ('${id}', '${JSON.stringify(nodeType).replace(/'/g, "''")}', datetime('now'))`,
					);
				}
			}

			await exec(state, 'COMMIT');
			console.log('[DataWorker] Initial load complete');
		} catch (error) {
			await exec(state, 'ROLLBACK');
			throw error;
		}
	} else {
		// Incremental sync: check for changes
		console.log('[DataWorker] Performing incremental sync...');

		const serverVersions: string[] = await getNodeTypeVersions(baseUrl);
		const serverVersionSet = new Set(serverVersions);
		console.log(`[DataWorker] Server has ${serverVersions.length} node type versions`);

		// Get existing node type IDs from the database
		const existingResult = await query(state, 'SELECT id FROM nodeTypes');
		const existingIds = new Set(existingResult.rows.map((row) => row[0] as string));
		console.log(`[DataWorker] Database has ${existingIds.size} node type versions`);

		// Find added node types (in server but not in DB)
		const addedVersions = serverVersions.filter((id) => !existingIds.has(id));

		// Find removed node types (in DB but not on server)
		const removedVersions = [...existingIds].filter((id) => !serverVersionSet.has(id));

		console.log(
			`[DataWorker] Changes: ${addedVersions.length} added, ${removedVersions.length} removed`,
		);

		// Apply changes in a transaction
		if (addedVersions.length > 0 || removedVersions.length > 0) {
			await exec(state, 'BEGIN TRANSACTION');

			try {
				// Remove deleted node types
				for (const id of removedVersions) {
					await exec(state, `DELETE FROM nodeTypes WHERE id = '${id}'`);
				}

				// If there are added node types, fetch all and insert the new ones
				if (addedVersions.length > 0) {
					const addedSet = new Set(addedVersions);
					const nodeTypes: INodeTypeDescription[] = await getNodeTypes(baseUrl);

					for (const nodeType of nodeTypes) {
						const versions = getNodeTypeVersionsFromDescription(nodeType);
						for (const version of versions) {
							const id = getNodeTypeId(nodeType.name, version);
							if (addedSet.has(id)) {
								await exec(
									state,
									`INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES ('${id}', '${JSON.stringify(nodeType).replace(/'/g, "''")}', datetime('now'))`,
								);
							}
						}
					}
				}

				await exec(state, 'COMMIT');
				console.log('[DataWorker] Incremental sync complete');
			} catch (error) {
				await exec(state, 'ROLLBACK');
				throw error;
			}
		} else {
			console.log('[DataWorker] No changes detected');
		}
	}
}

/**
 * Get a node type from the local database
 *
 * @param state - The data worker state
 * @param name - Node type name
 * @param version - Node type version
 * @returns The node type description or null if not found
 */
export async function getNodeType(
	state: DataWorkerState,
	name: string,
	version: number,
): Promise<INodeTypeDescription | null> {
	const id = getNodeTypeId(name, version);
	const result = await query(state, `SELECT data FROM nodeTypes WHERE id = '${id}'`);

	if (result.rows.length === 0) {
		return null;
	}

	const data = result.rows[0][0] as string;
	return jsonParse<INodeTypeDescription>(data);
}

/**
 * Get all node types from the local database
 *
 * @param state - The data worker state
 * @returns Array of all node type descriptions
 */
export async function getAllNodeTypes(state: DataWorkerState): Promise<INodeTypeDescription[]> {
	const result = await query(state, 'SELECT data FROM nodeTypes');

	return result.rows.map((row) => jsonParse<INodeTypeDescription>(row[0] as string));
}
