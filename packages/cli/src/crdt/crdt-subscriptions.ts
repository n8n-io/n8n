import {
	getNestedValue,
	type CRDTMap,
	type ChangeOrigin,
	type DeepChange,
	type Unsubscribe,
} from '@n8n/crdt';

/**
 * Subscribe to changes for a specific node in the nodes map.
 * Only fires when the specified node changes, not other nodes.
 *
 * @param nodesMap - The CRDT map containing all nodes
 * @param nodeId - The ID of the node to subscribe to
 * @param handler - Callback receiving changes and origin
 * @returns Unsubscribe function
 */
export function subscribeToNode(
	nodesMap: CRDTMap<unknown>,
	nodeId: string,
	handler: (changes: DeepChange[], origin: ChangeOrigin) => void,
): Unsubscribe {
	const nodeMap = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
	if (!nodeMap || !('onDeepChange' in nodeMap)) {
		// Node doesn't exist or isn't a CRDTMap, return no-op unsubscribe
		return () => {};
	}

	return nodeMap.onDeepChange(handler);
}

/**
 * Subscribe to changes for a specific parameter path within a node.
 * Only fires when the specified parameter (or its nested children) changes.
 *
 * @param nodesMap - The CRDT map containing all nodes
 * @param nodeId - The ID of the node
 * @param paramPath - The parameter path (e.g., 'operation' or 'assignments.assignments')
 * @param handler - Callback receiving the new value and origin
 * @returns Unsubscribe function
 */
export function subscribeToParameter(
	nodesMap: CRDTMap<unknown>,
	nodeId: string,
	paramPath: string,
	handler: (value: unknown, origin: ChangeOrigin) => void,
): Unsubscribe {
	const nodeMap = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
	if (!nodeMap || !('get' in nodeMap)) {
		return () => {};
	}

	const parametersMap = nodeMap.get('parameters') as CRDTMap<unknown> | undefined;
	if (!parametersMap || !('onDeepChange' in parametersMap)) {
		return () => {};
	}

	const pathParts = paramPath.split('.');

	return parametersMap.onDeepChange((changes, origin) => {
		// Check if any change is relevant to this parameter path
		const isRelevant = changes.some((change) => {
			const changePath = change.path.map(String);
			// Relevant if change path starts with our path or is a parent of our path
			return pathStartsWith(changePath, pathParts) || pathStartsWith(pathParts, changePath);
		});

		if (isRelevant) {
			// Get the current value at the parameter path
			const value = getNestedValue(parametersMap, pathParts);
			handler(value, origin);
		}
	});
}

/**
 * Subscribe to all parameter changes for a node.
 * Useful for validation or general parameter change tracking.
 *
 * @param nodesMap - The CRDT map containing all nodes
 * @param nodeId - The ID of the node
 * @param handler - Callback receiving changes and origin
 * @returns Unsubscribe function
 */
export function subscribeToNodeParameters(
	nodesMap: CRDTMap<unknown>,
	nodeId: string,
	handler: (changes: DeepChange[], origin: ChangeOrigin) => void,
): Unsubscribe {
	const nodeMap = nodesMap.get(nodeId) as CRDTMap<unknown> | undefined;
	if (!nodeMap || !('get' in nodeMap)) {
		return () => {};
	}

	const parametersMap = nodeMap.get('parameters') as CRDTMap<unknown> | undefined;
	if (!parametersMap || !('onDeepChange' in parametersMap)) {
		return () => {};
	}

	return parametersMap.onDeepChange(handler);
}

/**
 * Create a batched subscription that collects changes and fires once per microtask.
 * This prevents multiple re-renders when many changes happen in quick succession.
 *
 * @param subscribe - Function to set up the subscription
 * @param handler - Batched handler receiving all collected node IDs
 * @returns Unsubscribe function
 */
export function createBatchedNodesSubscription(
	nodesMap: CRDTMap<unknown>,
	handler: (changedNodeIds: Set<string>, origin: ChangeOrigin) => void,
): Unsubscribe {
	const pendingNodeIds = new Set<string>();
	let pendingOrigin: ChangeOrigin = 'local';
	let scheduled = false;

	return nodesMap.onDeepChange((changes, origin) => {
		// Collect affected node IDs from changes
		for (const change of changes) {
			if (change.path.length > 0) {
				// First path element is the node ID
				pendingNodeIds.add(String(change.path[0]));
			}
		}
		pendingOrigin = origin;

		if (!scheduled && pendingNodeIds.size > 0) {
			scheduled = true;
			queueMicrotask(() => {
				const nodeIds = new Set(pendingNodeIds);
				const batchOrigin = pendingOrigin;
				pendingNodeIds.clear();
				scheduled = false;
				handler(nodeIds, batchOrigin);
			});
		}
	});
}

/**
 * Check if pathA starts with pathB (pathB is prefix of pathA).
 */
function pathStartsWith(pathA: string[], pathB: string[]): boolean {
	if (pathA.length < pathB.length) {
		return false;
	}
	for (let i = 0; i < pathB.length; i++) {
		if (pathA[i] !== pathB[i]) {
			return false;
		}
	}
	return true;
}
