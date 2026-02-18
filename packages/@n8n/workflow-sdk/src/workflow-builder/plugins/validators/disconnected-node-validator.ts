/**
 * Disconnected Node Validator
 *
 * Validates that non-trigger nodes have incoming connections.
 * Nodes without incoming connections will not receive data and likely
 * indicate a workflow construction error.
 *
 * Skips:
 * - Trigger nodes (they start workflows, don't need incoming connections)
 * - Sticky notes (they don't participate in data flow)
 * - Subnodes connected via AI connections (they connect TO parent nodes)
 */

import { isStickyNoteType } from '../../../constants/node-types';
import type { GraphNode } from '../../../types/base';
import { isNodeChain } from '../../../types/base';
import { isTriggerNodeType } from '../../../utils/trigger-detection';
import {
	isIfElseComposite,
	isSwitchCaseComposite,
	isSplitInBatchesBuilder,
} from '../../type-guards';
import type { ValidatorPlugin, PluginContext, ValidationIssue } from '../types';
import { isAutoRenamed, formatNodeRef } from '../types';

/**
 * AI connection types used by subnodes to connect to parent nodes.
 */
const AI_CONNECTION_TYPES = [
	'ai_languageModel',
	'ai_memory',
	'ai_tool',
	'ai_outputParser',
	'ai_embedding',
	'ai_vectorStore',
	'ai_retriever',
	'ai_document',
	'ai_textSplitter',
	'ai_reranker',
];

/**
 * Check if a node is a subnode that's connected to a parent via AI connection types.
 * Subnodes connect outward TO their parent node (not the other way around).
 */
function isConnectedSubnode(graphNode: GraphNode): boolean {
	for (const [connType, outputMap] of graphNode.connections) {
		if (AI_CONNECTION_TYPES.includes(connType)) {
			// Check if it connects to a valid parent node
			for (const [_outputIndex, targets] of outputMap) {
				if (targets.length > 0) {
					return true; // Has AI connection to parent
				}
			}
		}
	}
	return false;
}

/**
 * Extract node name from a connection target, handling composite builders.
 * Returns the node name string or undefined if unable to extract.
 */
function getTargetNodeName(target: unknown): string | undefined {
	if (target === null || target === undefined) {
		return undefined;
	}

	// Handle IfElseBuilder/Composite - use ifNode.name
	if (isIfElseComposite(target)) {
		const ifElse = target as { ifNode: { name: string } };
		return ifElse.ifNode.name;
	}

	// Handle SwitchCaseBuilder/Composite - use switchNode.name
	if (isSwitchCaseComposite(target)) {
		const switchCase = target as { switchNode: { name: string } };
		return switchCase.switchNode.name;
	}

	// Handle SplitInBatchesBuilder - use sibNode.name
	if (isSplitInBatchesBuilder(target)) {
		const sib = target as { sibNode: { name: string } };
		return sib.sibNode.name;
	}

	// Handle objects with name property
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}

	// For primitives, convert to string
	if (typeof target === 'string') {
		return target;
	}
	if (typeof target === 'number' || typeof target === 'boolean') {
		return String(target);
	}

	return undefined;
}

/**
 * Find all nodes that have incoming connections from other nodes.
 */
function findNodesWithIncomingConnections(
	ctx: PluginContext,
	registry?: {
		resolveCompositeHeadName: (
			target: unknown,
			nameMapping?: Map<string, string>,
		) => string | undefined;
	},
): Set<string> {
	const nodesWithIncoming = new Set<string>();

	for (const [_name, graphNode] of ctx.nodes) {
		// Check connections stored in graphNode.connections (from workflow builder's .to())
		const mainConns = graphNode.connections.get('main');
		if (mainConns) {
			for (const [_outputIndex, targets] of mainConns) {
				for (const target of targets) {
					if (typeof target === 'object' && 'node' in target) {
						nodesWithIncoming.add(target.node);
					}
				}
			}
		}

		// Check connections declared via node's .to() (instance-level connections)
		if (typeof graphNode.instance.getConnections === 'function') {
			const connections = graphNode.instance.getConnections();
			for (const conn of connections) {
				// Get the target node name
				// For NodeChains, use head.name (entry point of the chain)
				if (isNodeChain(conn.target)) {
					nodesWithIncoming.add(conn.target.head.name);
				} else if (registry) {
					// Try composite resolution via registry
					const compositeHeadName = registry.resolveCompositeHeadName(conn.target);
					if (compositeHeadName !== undefined) {
						nodesWithIncoming.add(compositeHeadName);
					} else {
						const nodeName = getTargetNodeName(conn.target);
						if (nodeName !== undefined) {
							nodesWithIncoming.add(nodeName);
						}
					}
				} else {
					const nodeName = getTargetNodeName(conn.target);
					if (nodeName !== undefined) {
						nodesWithIncoming.add(nodeName);
					}
				}
			}
		}
	}

	return nodesWithIncoming;
}

/**
 * Validator that checks for disconnected nodes.
 *
 * Disconnected nodes (non-trigger nodes without incoming connections) indicate
 * a likely workflow construction error - these nodes won't receive any data.
 */
export const disconnectedNodeValidator: ValidatorPlugin = {
	id: 'core:disconnected-node',
	name: 'Disconnected Node Validator',
	priority: 10,

	// Per-node validation not used - we do workflow-level validation
	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		// Check if disconnected nodes are allowed
		if (ctx.validationOptions?.allowDisconnectedNodes) {
			return [];
		}

		const issues: ValidationIssue[] = [];
		const nodesWithIncoming = findNodesWithIncomingConnections(ctx);

		for (const [mapKey, graphNode] of ctx.nodes) {
			const originalName = graphNode.instance.name;

			// Skip trigger nodes - they don't need incoming connections
			if (isTriggerNodeType(graphNode.instance.type)) {
				continue;
			}

			// Skip sticky notes - they don't participate in data flow
			if (isStickyNoteType(graphNode.instance.type)) {
				continue;
			}

			// Skip subnodes - they connect TO their parent via AI connections
			if (isConnectedSubnode(graphNode)) {
				continue;
			}

			// Check if this node has any incoming connection (use mapKey, not originalName)
			if (!nodesWithIncoming.has(mapKey)) {
				const renamed = isAutoRenamed(mapKey, originalName);
				const displayName = renamed ? mapKey : originalName;
				const origForWarning = renamed ? originalName : undefined;
				const nodeRef = formatNodeRef(displayName, origForWarning, graphNode.instance.type);

				issues.push({
					code: 'DISCONNECTED_NODE',
					message: `${nodeRef} is not connected to any input. It will not receive data.`,
					severity: 'warning',
					violationLevel: 'major',
					nodeName: displayName,
					originalName: origForWarning,
				});
			}
		}

		return issues;
	},
};
