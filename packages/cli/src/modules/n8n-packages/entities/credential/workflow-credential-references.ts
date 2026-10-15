import {
	isNodeWithWorkflowSelector,
	jsonParse,
	type INode,
	type INodeCredentialsDetails,
	type IWorkflowBase,
} from 'n8n-workflow';

type CredentialVisitor = (credentialType: string, details: INodeCredentialsDetails) => boolean;

/**
 * Visits credentials in a workflow and its inline sub-workflows. The visitor
 * returns whether it mutated a reference so nested workflow JSON can be updated.
 */
export function visitWorkflowCredentials(
	nodes: INode[] | undefined,
	visitor: CredentialVisitor,
): boolean {
	if (!nodes) return false;

	let changed = false;
	for (const node of nodes) {
		for (const [credentialType, details] of Object.entries(node.credentials ?? {})) {
			changed = visitor(credentialType, details) || changed;
		}

		if (!isNodeWithWorkflowSelector(node)) continue;

		const workflowJson = node.parameters.workflowJson;
		if (typeof workflowJson !== 'string') continue;

		let inlineWorkflow: Partial<IWorkflowBase>;
		try {
			inlineWorkflow = jsonParse<Partial<IWorkflowBase>>(workflowJson);
		} catch {
			continue;
		}
		if (!inlineWorkflow || !Array.isArray(inlineWorkflow.nodes)) continue;

		if (visitWorkflowCredentials(inlineWorkflow.nodes, visitor)) {
			// Sub-workflow nodes are a parsed copy of a JSON string, not live refs,
			// so visitor mutations are lost unless we serialize them back.
			node.parameters.workflowJson = JSON.stringify(inlineWorkflow);
			changed = true;
		}
	}

	return changed;
}
