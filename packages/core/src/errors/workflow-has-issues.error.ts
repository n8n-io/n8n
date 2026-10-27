import type { INode, IWorkflowIssues } from 'n8n-workflow';
import { nodeIssuesToString, WorkflowOperationError } from 'n8n-workflow';

const MAX_NODES_IN_MESSAGE = 4;

function formatSingleNode(
	nodeName: string,
	issues: NonNullable<IWorkflowIssues[string]>,
	node: INode | undefined,
): string {
	const messages = nodeIssuesToString(issues, node);
	const bullets = messages.map((m) => `- ${m}`).join('\n');
	return `The '${nodeName}' node has issues:\n${bullets}`;
}

function formatMultipleNodes(
	workflowIssues: IWorkflowIssues,
	nodes: Record<string, INode>,
): string {
	const entries = Object.entries(workflowIssues);
	const bullets = entries.slice(0, MAX_NODES_IN_MESSAGE).map(([nodeName, issues]) => {
		const messages = nodeIssuesToString(issues, nodes[nodeName]);
		return `- '${nodeName}': ${messages.join(' ')}`;
	});

	const remaining = entries.length - bullets.length;
	if (remaining > 0) {
		bullets.push(`- (${remaining} more)`);
	}

	return `${entries.length} nodes have issues:\n${bullets.join('\n')}`;
}

export class WorkflowHasIssuesError extends WorkflowOperationError {
	constructor(workflowIssues: IWorkflowIssues, nodes: Record<string, INode>) {
		const entries = Object.entries(workflowIssues);
		const message =
			entries.length === 1
				? formatSingleNode(entries[0][0], entries[0][1], nodes[entries[0][0]])
				: formatMultipleNodes(workflowIssues, nodes);
		super(message);
	}
}
