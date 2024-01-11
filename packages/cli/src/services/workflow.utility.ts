import { WorkflowOperationError, type INode } from 'n8n-workflow';
import { Service as Utility } from 'typedi';
import { STARTING_NODES } from '@/constants';

@Utility()
export class WorkflowUtility {
	/**
	 * Find the node to start a workflow execution from:
	 * - for a subworkflow (`integrated` execution mode), or
	 * - for a CLI-started workflow (`cli` execution mode).
	 */
	findStartingNode(nodes: INode[], executionMode: 'cli' | 'integrated') {
		const found = nodes.find((n) => STARTING_NODES.includes(n.type));

		if (found) return found;

		throw new WorkflowOperationError(
			`Missing node to start execution on ${executionMode}`,
			undefined,
			"Please make sure the workflow you're calling contains an Execute Workflow Trigger node",
		);
	}
}
