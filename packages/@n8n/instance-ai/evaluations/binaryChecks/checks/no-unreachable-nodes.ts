import type { WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { forEachConnection, getActiveNodes, isTriggerNode } from '../utils';

function buildForwardAdjacency(connections: Record<string, unknown>): Map<string, Set<string>> {
	const adj = new Map<string, Set<string>>();
	forEachConnection(connections, (source, _connType, link) => {
		if (!adj.has(source)) adj.set(source, new Set());
		adj.get(source)!.add(link.node);
	});
	return adj;
}

function buildReverseAiAdjacency(connections: Record<string, unknown>): Map<string, Set<string>> {
	const rev = new Map<string, Set<string>>();
	forEachConnection(connections, (source, connType, link) => {
		if (!connType.startsWith('ai_')) return;
		if (!rev.has(link.node)) rev.set(link.node, new Set());
		rev.get(link.node)!.add(source);
	});
	return rev;
}

function bfsReachable(triggerNames: string[], forward: Map<string, Set<string>>): Set<string> {
	const visited = new Set<string>();
	const queue = [...triggerNames];

	for (const name of queue) {
		if (visited.has(name)) continue;
		visited.add(name);

		const neighbors = forward.get(name);
		if (neighbors) {
			for (const next of neighbors) {
				if (!visited.has(next)) queue.push(next);
			}
		}
	}

	return visited;
}

/**
 * Expand reachability through sub-nodes using a worklist.
 * Sub-nodes connect INTO parent nodes via ai_* outputs — if a parent is
 * reachable, all sub-nodes feeding into it are too.
 */
function expandSubNodes(reachable: Set<string>, reverse: Map<string, Set<string>>): void {
	const worklist: string[] = [...reachable];

	for (const target of worklist) {
		const sources = reverse.get(target);
		if (!sources) continue;
		for (const source of sources) {
			if (!reachable.has(source)) {
				reachable.add(source);
				worklist.push(source);
			}
		}
	}
}

export const noUnreachableNodes: BinaryCheck = {
	name: 'no_unreachable_nodes',
	description: 'All nodes are reachable from at least one trigger',
	kind: 'deterministic',
	run(workflow: WorkflowResponse) {
		const activeNodes = getActiveNodes(workflow.nodes ?? []);
		if (activeNodes.length === 0) return { pass: true };

		const triggers = activeNodes.filter((n) => isTriggerNode(n.type));
		if (triggers.length === 0) {
			return { pass: true, comment: 'Skipped: no triggers found' };
		}

		const connections = workflow.connections ?? {};
		const forward = buildForwardAdjacency(connections);
		const reverse = buildReverseAiAdjacency(connections);

		const reachable = bfsReachable(
			triggers.map((t) => t.name),
			forward,
		);
		expandSubNodes(reachable, reverse);

		const unreachable = activeNodes.filter((n) => !reachable.has(n.name)).map((n) => n.name);

		return {
			pass: unreachable.length === 0,
			...(unreachable.length > 0
				? { comment: `Unreachable from triggers: ${unreachable.join(', ')}` }
				: {}),
		};
	},
};
