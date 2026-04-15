import type { BinaryCheck } from '../types';
import { SET_NODE_TYPE } from '../utils';

/**
 * Set nodes should have at least one assignment configured.
 * An empty Set node does nothing and usually indicates the builder forgot to
 * configure it.
 */
export const noEmptySetNodes: BinaryCheck = {
	name: 'no_empty_set_nodes',
	description: 'Set nodes have at least one assignment configured',
	kind: 'deterministic',
	run(workflow) {
		const setNodes = (workflow.nodes ?? []).filter((n) => n.type === SET_NODE_TYPE);
		if (setNodes.length === 0) return { pass: true };

		const empty: string[] = [];
		for (const node of setNodes) {
			const params = node.parameters ?? {};

			// Raw/JSON mode uses jsonOutput instead of assignments
			if (params.mode === 'raw') {
				if (!params.jsonOutput) {
					empty.push(node.name);
				}
				continue;
			}

			const assignments = params.assignments as { assignments?: unknown[] } | undefined;
			const count = Array.isArray(assignments?.assignments) ? assignments.assignments.length : 0;

			if (count === 0) {
				empty.push(node.name);
			}
		}

		return {
			pass: empty.length === 0,
			...(empty.length > 0
				? { comment: `Set node(s) with no assignments: ${empty.join(', ')}` }
				: {}),
		};
	},
};
