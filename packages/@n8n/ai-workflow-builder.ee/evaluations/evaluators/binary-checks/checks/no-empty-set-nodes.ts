import type { BinaryCheck, SimpleWorkflow } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a Set node has values configured in either format:
 * - v3.x+: parameters.assignments.assignments (array)
 * - v2.x:  parameters.fields.values (array)
 */
function hasSetNodeValues(parameters: unknown): boolean {
	if (!isRecord(parameters)) return false;

	// v3.x+ format: assignments.assignments
	const assignments = parameters.assignments;
	if (isRecord(assignments)) {
		if (Array.isArray(assignments.assignments) && assignments.assignments.length > 0) return true;
	}

	// v2.x format: fields.values
	const fields = parameters.fields;
	if (isRecord(fields)) {
		if (Array.isArray(fields.values) && fields.values.length > 0) return true;
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
			if (node.type !== 'n8n-nodes-base.set') continue;

			if (!hasSetNodeValues(node.parameters)) {
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
