/**
 * Merge Node Validator Plugin
 *
 * Validates Merge nodes for proper input connections.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { isInputTarget } from '../../node-builders/node-builder';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	findMapKey,
} from '../types';

/**
 * Validator for Merge nodes.
 *
 * Checks for:
 * - Merge nodes with fewer than 2 distinct input connections
 */
export const mergeNodeValidator: ValidatorPlugin = {
	id: 'core:merge-node',
	name: 'Merge Node Validator',
	nodeTypes: ['n8n-nodes-base.merge'],
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Find the map key for this node (may be renamed from node.name)
		const mapKey = findMapKey(graphNode, ctx);
		const originalName = node.name;

		// Track which distinct input indices have connections
		const connectedInputIndices = new Set<number>();

		// Scan all nodes' connections to find which ones connect to this merge node
		for (const [_name, otherNode] of ctx.nodes) {
			const mainConns = otherNode.connections.get('main');
			if (mainConns) {
				for (const [_outputIndex, targets] of mainConns) {
					for (const target of targets) {
						// Compare against mapKey (the actual key in the workflow, potentially renamed)
						if (target.node === mapKey) {
							connectedInputIndices.add(target.index);
						}
					}
				}
			}

			// Also check connections declared via .to() from NodeInstances
			if (typeof otherNode.instance.getConnections === 'function') {
				const conns = otherNode.instance.getConnections();
				for (const conn of conns) {
					// Handle both NodeInstance and InputTarget
					const targetNode = isInputTarget(conn.target) ? conn.target.node : conn.target;
					const targetNodeName =
						typeof targetNode === 'object' && 'name' in targetNode ? targetNode.name : undefined;
					if (targetNode === node || targetNodeName === originalName) {
						// For InputTarget, use the specified index; for regular connections use targetInputIndex; default to 0
						const targetIndex = isInputTarget(conn.target)
							? conn.target.inputIndex
							: (conn.targetInputIndex ?? 0);
						connectedInputIndices.add(targetIndex);
					}
				}
			}
		}

		const inputCount = connectedInputIndices.size;
		if (inputCount < 2) {
			issues.push({
				code: 'MERGE_SINGLE_INPUT',
				message: `'${mapKey}' has only ${inputCount} input connection(s). Merge nodes require at least 2 inputs.`,
				severity: 'warning',
				violationLevel: 'major',
				nodeName: mapKey,
			});
		}

		return issues;
	},
};
