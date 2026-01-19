/**
 * Load Node Types Operation
 *
 * This module provides the operation for loading node types
 * from the server through the coordinator to the active tab's data worker.
 */

import { withActiveWorker } from '../utils';

/**
 * Load node types from the server (routes to active tab's worker)
 *
 * @param worker - The active data worker
 * @param state - The coordinator state
 * @param baseUrl - The base URL for API requests
 */
export const loadNodeTypes = withActiveWorker(async (worker, baseUrl: string) => {
	console.log('[Coordinator] loadNodeTypes');
	return await worker.loadNodeTypes(baseUrl);
});
