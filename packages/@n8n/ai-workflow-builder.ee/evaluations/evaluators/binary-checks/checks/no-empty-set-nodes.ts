import type { BinaryCheck, SimpleWorkflow } from '../types';

/**
 * Check if a Set node has values configured in either format:
 * - v3.x+: parameters.assignments.assignments (array)
 * - v2.x:  parameters.fields.values (array)
 */
function hasSetNodeValues(parameters: Record<string, unknown> | undefined): boolean {
	if (!parameters) return false;

	// v3.x+ format: assignments.assignments
	const assignments = parameters.assignments;
	if (typeof assignments === 'object' && assignments !== null) {
		const inner = (assignments as Record<string, unknown>).assignments;
		if (Array.isArray(inner) && inner.length > 0) return true;
	}

	// v2.x format: fields.values
	const fields = parameters.fields;
	if (typeof fields === 'object' && fields !== null) {
		const values = (fields as Record<string, unknown>).values;
		if (Array.isArray(values) && values.length > 0) return true;
	}

	return false;
}

export const noEmptySetNodes: BinaryCheck = {
	name: 'no_empty_set_nodes',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		if (!workflow.nodes || workflow.nodes.length === 0) {
			return { pass: true };
		}

		const emptySetNodes: string[] = [];
		for (const node of workflow.nodes) {
			if (!node.type.endsWith('n8n-nodes-base.set')) continue;

			if (!hasSetNodeValues(node.parameters as Record<string, unknown> | undefined)) {
				emptySetNodes.push(node.name);
			}
		}

		return {
			pass: emptySetNodes.length === 0,
			...(emptySetNodes.length > 0
				? { comment: `Empty Set nodes (no assignments): ${emptySetNodes.join(', ')}` }
				: {}),
		};
	},
};
