/**
 * Split In Batches Loopback Validator
 *
 * The done output only carries items that looped back via nextBatch.
 * Flags Split In Batches nodes whose each-batch branch never reconnects.
 */

import { NODE_TYPES } from '../../../constants/node-types';
import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;
	if (
		typeof target === 'object' &&
		'node' in target &&
		typeof (target as { node: unknown }).node === 'object'
	) {
		return (target as { node: { name?: string } }).node?.name;
	}
	if (isNodeChain(target)) {
		return target.head.name;
	}
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}
	return undefined;
}

function mainTargetsAt(graphNode: GraphNode, outputIndex: number): string[] {
	const names: string[] = [];
	const mainConns = graphNode.connections.get('main');
	const targets = mainConns?.get(outputIndex);
	if (targets) {
		for (const target of targets) {
			names.push(target.node);
		}
	}
	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			const index = conn.outputIndex ?? 0;
			if (index !== outputIndex) continue;
			const name = resolveTargetNodeName(conn.target);
			if (name) names.push(name);
		}
	}
	return [...new Set(names)];
}

function allMainSuccessors(graphNode: GraphNode): string[] {
	const names: string[] = [];
	const mainConns = graphNode.connections.get('main');
	if (mainConns) {
		for (const [_index, targets] of mainConns) {
			for (const target of targets) {
				names.push(target.node);
			}
		}
	}
	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			const name = resolveTargetNodeName(conn.target);
			if (name) names.push(name);
		}
	}
	return [...new Set(names)];
}

function reachesNode(
	startNames: string[],
	targetName: string,
	nodes: ReadonlyMap<string, GraphNode>,
): boolean {
	const visited = new Set<string>();
	const queue = [...startNames];

	while (queue.length > 0) {
		const name = queue.shift();
		if (!name || visited.has(name)) continue;
		visited.add(name);
		if (name === targetName) return true;

		const graphNode = nodes.get(name);
		if (!graphNode) continue;
		queue.push(...allMainSuccessors(graphNode));
	}

	return false;
}

/**
 * Validator for Split In Batches loops that never reconnect.
 */
export const splitInBatchesLoopbackValidator: ValidatorPlugin = {
	id: 'core:split-in-batches-loopback',
	name: 'Split In Batches Loopback Validator',
	nodeTypes: [NODE_TYPES.SPLIT_IN_BATCHES],
	priority: 36,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		// Output 1 = each batch. If nothing is wired there, there is no loop to check
		// (or the node is unused) — leave that to disconnected-node / incomplete wiring.
		const eachTargets = mainTargetsAt(graphNode, 1);
		if (eachTargets.length === 0) {
			return [];
		}

		if (reachesNode(eachTargets, node.name, ctx.nodes)) {
			return [];
		}

		return [
			{
				code: 'SPLIT_IN_BATCHES_NO_LOOPBACK',
				message:
					`'${node.name}' Split In Batches has an each-batch branch but nothing loops back to it. ` +
					'Items only reach the done output after they cycle through nextBatch — wire the end of the ' +
					'each-batch chain back with `nextBatch` / `.to(splitInBatchesNode)`, or the done branch stays empty.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			},
		];
	},
};
