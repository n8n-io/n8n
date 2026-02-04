import { NodeHelpers } from 'n8n-workflow';
import type {
	INodeProperties,
	INodeCredentialDescription,
	INodeTypeDescription,
	INodeIssues,
	INodeIssueObjectProperty,
	INode,
	INodeParameters,
} from 'n8n-workflow';

import type { INodeUi } from '@/Interface';

export function hasProxyAuth(node: INodeUi): boolean {
	return Object.keys(node.parameters).includes('nodeCredentialType');
}

/**
 * Returns if the given parameter should be displayed or not
 */
export function displayParameter(
	nodeValues: INodeParameters,
	parameter: INodeProperties | INodeCredentialDescription,
	path: string,
	node: INodeUi | null,
	nodeTypeDescription: INodeTypeDescription | null,
	displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
): boolean {
	return NodeHelpers.displayParameterPath(
		nodeValues,
		parameter,
		path,
		node,
		nodeTypeDescription,
		displayKey,
	);
}

/**
 * Returns the issues of the node as string
 */
export function nodeIssuesToString(issues: INodeIssues, node?: INode): string[] {
	const nodeIssues: string[] = [];

	if (issues.execution !== undefined) {
		nodeIssues.push('Execution Error.');
	}

	const objectProperties = ['parameters', 'credentials', 'input'];

	let issueText: string;
	let parameterName: string;
	for (const propertyName of objectProperties) {
		if (issues[propertyName] !== undefined) {
			for (parameterName of Object.keys(issues[propertyName] as object)) {
				for (issueText of (issues[propertyName] as INodeIssueObjectProperty)[parameterName]) {
					nodeIssues.push(issueText);
				}
			}
		}
	}

	if (issues.typeUnknown !== undefined) {
		if (node !== undefined) {
			nodeIssues.push(`Node Type "${node.type}" is not known.`);
		} else {
			nodeIssues.push('Node Type is not known.');
		}
	}

	return nodeIssues;
}
