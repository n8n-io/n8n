import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { ITag } from '@n8n/rest-api-client/api/tags';

/**
 * Converts workflow tags from ITag[] (API response format) to string[] (store format)
 * Or keeps original value if already in string[] format
 */
export function convertWorkflowTagsToIds(tags: ITag[] | string[] | undefined): string[] {
	if (!tags || !Array.isArray(tags)) return [];
	if (tags.length === 0) return tags as string[];
	if (typeof tags[0] === 'object' && 'id' in tags[0]) {
		return (tags as ITag[]).map((tag) => tag.id);
	}
	return tags as string[];
}

/**
 * Removes execution data from workflow nodes and workflow-level execution data
 * to ensure clean comparisons in diffs. This prevents execution status, run data,
 * pinned data, and other runtime information from appearing in workflow difference
 * comparisons.
 */
export function removeWorkflowExecutionData(
	workflow: IWorkflowDb | undefined,
): IWorkflowDb | undefined {
	if (!workflow) return workflow;

	// Remove workflow-level execution data and clean up nodes
	const { pinData, ...cleanWorkflow } = workflow;

	const sanitizedWorkflow: IWorkflowDb = {
		...cleanWorkflow,
		nodes: workflow.nodes.map((node: INodeUi) => {
			// Create a clean copy without execution-related data
			const { issues, pinData, ...cleanNode } = node;
			return cleanNode;
		}),
	};

	return sanitizedWorkflow;
}
