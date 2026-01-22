/**
 * Dispatch Parallel Configuration
 *
 * After Builder completes, this node dispatches parallel Send() workers
 * to configure each node concurrently. This parallelizes the most expensive
 * part - the LLM calls for parameter configuration.
 */

import { Send } from '@langchain/langgraph';
import type { INodeTypeDescription, Logger } from 'n8n-workflow';

import type { ParentGraphState } from '../parent-graph-state';
import { extractUserRequest } from '../utils/subgraph-helpers';

/**
 * Identifies which nodes need configuration.
 * Filters out nodes that:
 * - Are already configured (have complex parameters beyond resource/operation)
 * - Don't need configuration (triggers with no parameters, etc.)
 */
function getNodesNeedingConfiguration(
	state: typeof ParentGraphState.State,
	parsedNodeTypes: INodeTypeDescription[],
): string[] {
	const { workflowJSON, configuredNodeIds = [] } = state;
	const nodesToConfigure: string[] = [];

	// Build a set of already configured nodes for O(1) lookup
	const configuredSet = new Set(configuredNodeIds);

	for (const node of workflowJSON.nodes) {
		// Skip already configured nodes
		if (configuredSet.has(node.id)) {
			continue;
		}

		// Find the node type definition
		const nodeType = parsedNodeTypes.find(
			(nt) =>
				nt.name === node.type &&
				(Array.isArray(nt.version)
					? nt.version.includes(node.typeVersion)
					: nt.version === node.typeVersion),
		);

		// Skip if no node type found (shouldn't happen)
		if (!nodeType) {
			continue;
		}

		// Check if node has configurable properties beyond resource/operation
		const hasConfigurableProperties = nodeType.properties?.some(
			(prop) => !['resource', 'operation'].includes(prop.name),
		);

		if (hasConfigurableProperties) {
			nodesToConfigure.push(node.id);
		}
	}

	return nodesToConfigure;
}

export interface DispatchParallelConfigParams {
	parsedNodeTypes: INodeTypeDescription[];
	logger?: Logger;
}

/**
 * Node that prepares state for parallel configuration dispatch.
 * Returns the list of node IDs that need configuration.
 */
export function createPrepareConfigDispatchNode(params: DispatchParallelConfigParams) {
	return (state: typeof ParentGraphState.State): Partial<typeof ParentGraphState.State> => {
		const { parsedNodeTypes, logger } = params;

		const nodesToConfigure = getNodesNeedingConfiguration(state, parsedNodeTypes);

		logger?.debug('[DispatchConfig] Preparing parallel configuration', {
			totalNodes: state.workflowJSON.nodes.length,
			nodesToConfigure: nodesToConfigure.length,
		});

		return {
			nodesToConfigure,
		};
	};
}

/**
 * Conditional edge function that dispatches Send() workers for each node.
 * Called from conditional edge after prepare_config_dispatch.
 *
 * Returns:
 * - Array of Send objects to configure_node workers if there are nodes to configure
 * - 'skip_config' string if no nodes need configuration
 */
export function createDispatchConfigWorkers(params: DispatchParallelConfigParams) {
	return (state: typeof ParentGraphState.State): Send[] | string => {
		const { parsedNodeTypes, logger } = params;
		const {
			nodesToConfigure = [],
			workflowJSON,
			discoveryContext,
			workflowContext,
			instanceUrl,
			messages,
		} = state;

		// If no nodes to configure, skip to validation
		if (nodesToConfigure.length === 0) {
			logger?.debug('[DispatchConfig] No nodes to configure, skipping');
			return 'validation';
		}

		// Extract user request from messages
		const userRequest = extractUserRequest(messages);

		// Create Send objects for each node
		const sends: Send[] = [];

		for (const nodeId of nodesToConfigure) {
			const node = workflowJSON.nodes.find((n) => n.id === nodeId);
			if (!node) continue;

			// Find node type definition
			const nodeType = parsedNodeTypes.find(
				(nt) =>
					nt.name === node.type &&
					(Array.isArray(nt.version)
						? nt.version.includes(node.typeVersion)
						: nt.version === node.typeVersion),
			);

			if (!nodeType) continue;

			logger?.debug('[DispatchConfig] Dispatching worker for node', {
				nodeId: node.id,
				nodeName: node.name,
				nodeType: node.type,
			});

			// Dispatch Send to configure_node worker
			sends.push(
				new Send('configure_node', {
					node,
					nodeType,
					userRequest,
					discoveryContext,
					workflow: workflowJSON,
					workflowContext,
					instanceUrl,
				}),
			);
		}

		if (sends.length === 0) {
			return 'validation';
		}

		return sends;
	};
}
