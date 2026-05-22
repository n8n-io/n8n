import type { INode, INodeIssues, IWorkflowIssues } from 'n8n-workflow';
import { WorkflowOperationError } from 'n8n-workflow';

const BASE_MESSAGE =
	'The workflow has issues and cannot be executed for that reason. Please fix them first.';

const OBJECT_ISSUE_PROPERTIES = ['parameters', 'credentials', 'input'] as const;

function nodeIssuesToMessages(issues: INodeIssues, node: INode | undefined): string[] {
	const messages: string[] = [];

	if (issues.execution !== undefined) {
		messages.push('Execution Error.');
	}

	for (const propertyName of OBJECT_ISSUE_PROPERTIES) {
		const propertyIssues = issues[propertyName];
		if (propertyIssues === undefined || typeof propertyIssues === 'boolean') continue;

		for (const parameterName of Object.keys(propertyIssues)) {
			for (const issueText of propertyIssues[parameterName]) {
				messages.push(issueText);
			}
		}
	}

	if (issues.typeUnknown !== undefined) {
		messages.push(
			node !== undefined ? `Node Type "${node.type}" is not known.` : 'Node Type is not known.',
		);
	}

	return messages;
}

function formatWorkflowIssues(
	workflowIssues: IWorkflowIssues,
	nodes: Record<string, INode> | undefined,
): string {
	return Object.entries(workflowIssues)
		.map(([nodeName, nodeIssues]) => {
			const messages = nodeIssuesToMessages(nodeIssues, nodes?.[nodeName]);
			return `'${nodeName}': ${messages.join('; ')}`;
		})
		.join(' | ');
}

export class WorkflowHasIssuesError extends WorkflowOperationError {
	constructor(workflowIssues?: IWorkflowIssues, nodes?: Record<string, INode>) {
		let message = BASE_MESSAGE;
		if (workflowIssues && Object.keys(workflowIssues).length > 0) {
			message = `${BASE_MESSAGE} Issues: ${formatWorkflowIssues(workflowIssues, nodes)}`;
		}
		super(message);
	}
}
