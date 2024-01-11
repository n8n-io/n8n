import { WorkflowOperationError, type INode } from 'n8n-workflow';
import { Service as Utility } from 'typedi';
import { STARTING_NODES } from '@/constants';

@Utility()
export class WorkflowUtility {
	/**
	 * Find the node to start execution from:
	 * - for a subworkflow (`integrated` execution mode), or
	 * - for a CLI-started workflow (`cli` execution mode).
	 */
	findStartingNode(nodes: INode[], executionMode: 'cli' | 'integrated') {
		const found = nodes.find((node) => STARTING_NODES.includes(node.type));

		if (found) return found;

		throw new WorkflowOperationError(
			`Missing node to start execution on ${executionMode}`,
			undefined,
			"Please make sure the workflow you're calling contains an Execute Workflow Trigger node",
		);
	}
}
