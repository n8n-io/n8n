import type { BinaryCheck } from '../types';

/** Tool nodes in n8n follow this naming convention. */
function isToolNode(type: string): boolean {
	const shortName = type.split('.').pop() ?? '';
	return shortName.endsWith('Tool') || shortName === 'tool';
}

/** Check if any value in the parameters tree contains $fromAI. */
function containsFromAi(value: unknown): boolean {
	if (typeof value === 'string') {
		return value.includes('$fromAI');
	}
	if (Array.isArray(value)) {
		return value.some(containsFromAi);
	}
	if (typeof value === 'object' && value !== null) {
		return Object.values(value).some(containsFromAi);
	}
	return false;
}

export const noInvalidFromAi: BinaryCheck = {
	name: 'no_invalid_from_ai',
	description: 'Only tool nodes use $fromAI() in their parameters',
	kind: 'deterministic',
	dimension: 'parameter_correctness',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		const usesFromAiAnywhere = nodes.some((n) => n.parameters && containsFromAi(n.parameters));
		if (!usesFromAiAnywhere) return { pass: true, applicable: false };

		const issues: string[] = [];
		for (const node of nodes) {
			if (isToolNode(node.type)) continue;
			if (!node.parameters) continue;

			if (containsFromAi(node.parameters)) {
				issues.push(`"${node.name}" (${node.type}) uses $fromAI but is not a tool node`);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
