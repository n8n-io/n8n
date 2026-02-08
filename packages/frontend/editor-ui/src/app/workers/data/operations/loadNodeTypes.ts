/**
 * Load Node Types
 *
 * This module handles loading and syncing node types from the server
 * to the local SQLite database for caching.
 *
 * The functions accept the data worker state, allowing them to be
 * called from within web workers while keeping the code modular.
 */

import {
	getNodeTypes,
	getNodeTypeVersions,
	getNodeTypesByIdentifier,
} from '@n8n/rest-api-client/api/nodeTypes';
import type { INodeTypeDescription } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { DataWorkerState } from '../types';
import { exec, execWithParams, query, queryWithParams, withTrx } from './query';
import { getStoredVersion, storeVersion } from './storeVersion';

/**
 * Generate a unique ID for a node type version
 */
function getNodeTypeId(name: string, version: number): string {
	return `${name}@${version}`;
}

/**
 * Convert a database row to a node type description
 */
function rowToNodeType(data: string): INodeTypeDescription {
	return jsonParse<INodeTypeDescription>(data);
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
 * Create a REST API context for making authenticated requests
 */
function createRestApiContext(baseUrl: string) {
	return {
		baseUrl: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl,
		pushRef: '',
	};
}

/**
 * Upsert a node type into the database
 *
 * @param state - The data worker state
 * @param id - The unique identifier for the node type (name@version)
 * @param nodeType - The node type description to store
 */
async function upsertNodeType(
	state: DataWorkerState,
	id: string,
	nodeType: INodeTypeDescription,
): Promise<void> {
	await execWithParams(
		state,
		"INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES (?, ?, datetime('now'))",
		[id, JSON.stringify(nodeType)],
	);
}

/**
 * Delete a node type from the database
 *
 * @param state - The data worker state
 * @param id - The unique identifier for the node type (name@version)
 */
async function deleteNodeType(state: DataWorkerState, id: string): Promise<void> {
	await execWithParams(state, 'DELETE FROM nodeTypes WHERE id = ?', [id]);
}

/**
 * Load node types from the server and sync with the local database
 *
 * @param state - The data worker state
 * @param baseUrl - The base URL for API requests
 */
export async function loadNodeTypes(state: DataWorkerState, baseUrl: string): Promise<void> {
	console.log('[DataWorker] loadNodeTypes');

	if (!state.initialized) {
		throw new Error('[DataWorker] Database not initialized');
	}

	// Check stored version and handle version changes
	const storedVersion = await getStoredVersion(state);
	const currentVersion = state.version;
	console.log('[DataWorker] Stored version:', storedVersion);
	console.log('[DataWorker] Current version:', currentVersion);

	if (storedVersion !== null && currentVersion !== null && storedVersion !== currentVersion) {
		console.log(
			`[DataWorker] Version changed: ${storedVersion} -> ${currentVersion}, clearing node types`,
		);
		await exec(state, 'DELETE FROM nodeTypes');
		console.log('[DataWorker] Node types cleared');
	}

	// Update stored version if different
	if (currentVersion !== null && storedVersion !== currentVersion) {
		await storeVersion(state, currentVersion);
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
		await withTrx(state, async () => {
			for (const nodeType of nodeTypes) {
				const versions = getNodeTypeVersionsFromDescription(nodeType);
				for (const version of versions) {
					const id = getNodeTypeId(nodeType.name, version);
					await upsertNodeType(state, id, nodeType);
				}
			}
		});
		console.log('[DataWorker] Initial load complete');
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
			await withTrx(state, async () => {
				// Remove deleted node types
				for (const id of removedVersions) {
					await deleteNodeType(state, id);
				}

				// Fetch only the missing node types using the new endpoint
				if (addedVersions.length > 0) {
					console.log(
						`[DataWorker] Fetching ${addedVersions.length} missing node types by identifier...`,
					);
					const restApiContext = createRestApiContext(baseUrl);
					const nodeTypes: INodeTypeDescription[] = await getNodeTypesByIdentifier(
						restApiContext,
						addedVersions,
					);
					console.log(`[DataWorker] Received ${nodeTypes.length} node types from server`);

					for (const nodeType of nodeTypes) {
						const versions = getNodeTypeVersionsFromDescription(nodeType);
						for (const version of versions) {
							const id = getNodeTypeId(nodeType.name, version);
							// Only insert if this is one of the added versions we requested
							if (addedVersions.includes(id)) {
								await upsertNodeType(state, id, nodeType);
							}
						}
					}
				}
			});
			console.log('[DataWorker] Incremental sync complete');
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
	const result = await queryWithParams(state, 'SELECT data FROM nodeTypes WHERE id = ?', [id]);

	if (result.rows.length === 0) {
		return null;
	}

	return rowToNodeType(result.rows[0][0] as string);
}

/**
 * Get all node types from the local database
 *
 * @param state - The data worker state
 * @returns Array of all node type descriptions
 */
export async function getAllNodeTypes(state: DataWorkerState): Promise<INodeTypeDescription[]> {
	const result = await query(state, 'SELECT data FROM nodeTypes');

	return result.rows.map((row) => rowToNodeType(row[0] as string));
}
