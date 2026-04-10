import type { BinaryCheck } from '../types';
import { isTriggerNode } from '../utils';

function hasDownstreamConnection(
	sourceName: string,
	connections: Record<string, unknown>,
): boolean {
	const outputs = connections[sourceName];
	if (typeof outputs !== 'object' || outputs === null) return false;

	const main = (outputs as Record<string, unknown>).main;
	if (!Array.isArray(main)) return false;

	for (const outputSlot of main) {
		if (Array.isArray(outputSlot) && outputSlot.length > 0) return true;
	}
	return false;
}

export const hasStartNode: BinaryCheck = {
	name: 'has_start_node',
	description: 'At least one trigger has a downstream node connected',
	kind: 'deterministic',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		if (nodes.length === 0) return { pass: false, comment: 'Workflow has no nodes' };

		const connections = workflow.connections ?? {};
		const triggers = nodes.filter((n) => isTriggerNode(n.type));

		if (triggers.length === 0) {
			return { pass: false, comment: 'No trigger node found' };
		}

		for (const trigger of triggers) {
			if (hasDownstreamConnection(trigger.name, connections)) {
				return { pass: true };
			}
		}

		return { pass: false, comment: 'No trigger has a downstream node connected' };
	},
};
