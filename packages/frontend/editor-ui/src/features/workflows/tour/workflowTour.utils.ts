import type { WorkflowNodeDescriptions } from './workflowTour.types';

export function readWorkflowNodeDescriptions(
	meta: unknown,
	nodeIds: Iterable<string>,
): WorkflowNodeDescriptions | undefined {
	if (typeof meta !== 'object' || meta === null) return undefined;

	const descriptions: unknown = Reflect.get(meta, 'nodeDescriptions');
	if (typeof descriptions !== 'object' || descriptions === null) return undefined;

	const result: WorkflowNodeDescriptions = {};
	for (const nodeId of nodeIds) {
		const descriptionValue: unknown = Reflect.get(descriptions, nodeId);
		if (typeof descriptionValue !== 'object' || descriptionValue === null) continue;

		const summary: unknown = Reflect.get(descriptionValue, 'summary');
		if (typeof summary !== 'string' || summary.trim().length === 0) continue;

		const rationale: unknown = Reflect.get(descriptionValue, 'rationale');
		result[nodeId] = {
			summary,
			...(typeof rationale === 'string' && rationale.trim().length > 0 ? { rationale } : {}),
		};
	}

	return Object.keys(result).length > 0 ? result : undefined;
}
