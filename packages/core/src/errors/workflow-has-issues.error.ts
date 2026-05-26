import type { INode, IWorkflowIssues } from 'n8n-workflow';
import { nodeIssuesToString, WorkflowOperationError } from 'n8n-workflow';

export const BASE_MESSAGE =
	'The workflow has issues and cannot be executed for that reason. Please fix them first.';

const MAX_NODES_IN_MESSAGE = 4;

function formatWorkflowIssues(
	workflowIssues: IWorkflowIssues,
	nodes: Record<string, INode>,
): string {
	const entries = Object.entries(workflowIssues);
	const segments = entries.slice(0, MAX_NODES_IN_MESSAGE).map(([nodeName, nodeIssues]) => {
		const messages = nodeIssuesToString(nodeIssues, nodes[nodeName]);
		return `'${nodeName}': ${messages.join(' ')}`;
	});

	const remaining = entries.length - segments.length;
	if (remaining > 0) {
		segments.push(`(${remaining} more)`);
	}

	return segments.join(' | ');
}

export class WorkflowHasIssuesError extends WorkflowOperationError {
	constructor(workflowIssues: IWorkflowIssues, nodes: Record<string, INode>) {
		super(`${BASE_MESSAGE} Issues: ${formatWorkflowIssues(workflowIssues, nodes)}`);
	}
}
