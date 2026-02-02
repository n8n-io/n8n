/**
 * Load Node Types Operation
 *
 * This module provides the operation for loading node types
 * from the server through the coordinator to the active tab's data worker.
 * After loading to SQLite, it also populates the coordinator's nodeTypes cache.
 */

import type { CoordinatorState } from '../types';
import { ensureInitialized } from '../initialize';
import { getRequiredActiveDataWorker } from '../tabs';

/**
 * Load node types from the server (routes to active tab's worker)
 * Also populates the coordinator's global nodeTypes cache.
 *
 * @param state - The coordinator state
 * @param baseUrl - The base URL for API requests
 */
export async function loadNodeTypes(state: CoordinatorState, baseUrl: string): Promise<void> {
	await ensureInitialized(state);
	const worker = getRequiredActiveDataWorker(state);

	// Load node types into SQLite
	await worker.loadNodeTypes(baseUrl);

	// Populate coordinator's global nodeTypes cache
	const allTypes = await worker.getAllNodeTypes();

	// Build a map keyed by "name@version" to support multi-version lookups
	// SQLite stores each version separately, so we need to keep all of them
	state.nodeTypes = new Map();
	for (const nodeType of allTypes) {
		// Extract all versions from this node type description
		const versions = Array.isArray(nodeType.version) ? nodeType.version : [nodeType.version ?? 1];

		// Store under each version key for precise lookups
		for (const version of versions) {
			const key = `${nodeType.name}@${version}`;
			state.nodeTypes.set(key, nodeType);
		}
	}

	// Resolve the nodeTypesPromise to unblock any waiting seedDocument calls
	if (state.nodeTypesResolver) {
		state.nodeTypesResolver();
		state.nodeTypesResolver = null;
	}
}
