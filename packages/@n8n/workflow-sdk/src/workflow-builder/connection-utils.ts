/**
 * Connection Utilities
 *
 * Functions for resolving connection targets and managing node connections.
 */

import type { GraphNode, NodeInstance } from '../types/base';
import { isInputTarget } from './node-builders/node-builder';
import type { PluginRegistry } from './plugins/registry';
import { isNodeChain } from '../types/base';

/**
 * Find the map key for a node instance by its ID.
 * This handles renamed duplicate nodes where the map key differs from instance.name.
 */
export function findMapKeyForNodeId(
	nodeId: string,
	nodes: ReadonlyMap<string, GraphNode>,
): string | undefined {
	for (const [key, graphNode] of nodes) {
		if (graphNode.instance.id === nodeId) {
			return key;
		}
	}
	return undefined;
}

/**
 * Resolve the target node name from a connection target.
 * Handles NodeInstance, NodeChain, and composites (via registry's resolveCompositeHeadName).
 * Returns the map key (which may differ from instance.name for renamed duplicates).
 *
 * @param target - The connection target to resolve
 * @param nodes - The nodes map to search in
 * @param registry - Plugin registry for composite resolution
 * @param nameMapping - Optional map from node ID to actual map key
 */
export function resolveTargetNodeName(
	target: unknown,
	nodes: ReadonlyMap<string, GraphNode>,
	registry: PluginRegistry,
	nameMapping?: Map<string, string>,
): string | undefined {
	if (target === null || typeof target !== 'object') return undefined;

	// Helper to get the actual node name, accounting for auto-renamed nodes
	const getNodeName = (nodeInstance: { id: string; name: string }): string => {
		// First check the passed-in nameMapping
		const mappedKey = nameMapping?.get(nodeInstance.id);
		if (mappedKey) return mappedKey;

		// Fall back to searching in nodes
		const mapKey = findMapKeyForNodeId(nodeInstance.id, nodes);
		if (!mapKey) return nodeInstance.name;

		// Check if this is an auto-renamed node (e.g., "Process 1" from "Process")
		const isAutoRenamed =
			mapKey !== nodeInstance.name &&
			mapKey.startsWith(nodeInstance.name + ' ') &&
			/^\d+$/.test(mapKey.slice(nodeInstance.name.length + 1));

		return isAutoRenamed ? mapKey : nodeInstance.name;
	};

	// Check for NodeChain - return the head's name
	if (isNodeChain(target)) {
		return getNodeName(target.head);
	}

	// Try registry resolution for composites (IfElse, SwitchCase, SplitInBatches).
	// When the handler exposes the head as { name, id }, resolve renames through the
	// live nodes map too: nameMapping alone misses auto-renamed heads (e.g. a source
	// chain whose head collided with an existing node name).
	const compositeHandler = registry.findCompositeHandler(target);
	if (compositeHandler) {
		const headInfo = compositeHandler.getHeadNodeName?.(target);
		if (typeof headInfo === 'object' && headInfo !== null && 'name' in headInfo) {
			return getNodeName(headInfo);
		}
		return registry.resolveCompositeHeadName(target, nameMapping);
	}

	// Check for InputTarget - return the referenced node's name
	if (isInputTarget(target)) {
		return getNodeName((target as { node: NodeInstance<string, string, unknown> }).node);
	}

	// Regular NodeInstance
	return getNodeName(target as NodeInstance<string, string, unknown>);
}
