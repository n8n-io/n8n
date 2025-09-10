import type { IWorkflowDb, INodeUi } from '@/Interface';

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
