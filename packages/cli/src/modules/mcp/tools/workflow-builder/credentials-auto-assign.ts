import type { User } from '@n8n/db';
import type { INodeTypeDescription, IWorkflowBase } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';

export interface CredentialAssignment {
	nodeName: string;
	credentialName: string;
	credentialType: string;
}

export interface AutoAssignResult {
	assignments: CredentialAssignment[];
	skippedHttpNodes: string[];
}

const HTTP_NODE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
	'n8n-nodes-base.httpRequestTool',
]);

/**
 * Auto-populates missing credentials on workflow nodes by assigning
 * a credential of the matching type that the user can actually use
 * in the target project. Only credentials accessible to both the user
 * and the project are considered, preventing cross-project assignments.
 *
 * HTTP Request nodes are skipped for security
 */
export async function autoPopulateNodeCredentials(
	workflow: IWorkflowBase,
	user: User,
	nodeTypes: NodeTypes,
	credentialsService: CredentialsService,
	projectId: string,
): Promise<AutoAssignResult> {
	const usableCredentials = await credentialsService.getCredentialsAUserCanUseInAWorkflow(user, {
		projectId,
	});

	const credentialsByType = new Map<string, Array<{ id: string; name: string }>>();
	for (const cred of usableCredentials) {
		const list = credentialsByType.get(cred.type) ?? [];
		list.push({ id: cred.id, name: cred.name });
		credentialsByType.set(cred.type, list);
	}

	const assignments: CredentialAssignment[] = [];
	const skippedHttpNodes: string[] = [];

	for (const node of workflow.nodes) {
		if (node.disabled) continue;

		if (HTTP_NODE_TYPES.has(node.type)) {
			skippedHttpNodes.push(node.name);
			continue;
		}

		let nodeTypeDescription: INodeTypeDescription;
		try {
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			nodeTypeDescription = nodeType.description;
		} catch {
			continue;
		}

		const credentialDescriptions = nodeTypeDescription.credentials;
		if (!credentialDescriptions?.length) continue;

		// Resolve node parameters with defaults so displayOptions evaluation
		// works for parameters not explicitly set (e.g. "authentication" defaults to "oAuth2")
		const nodeParametersWithDefaults =
			NodeHelpers.getNodeParameters(
				nodeTypeDescription.properties,
				node.parameters,
				true, // returnDefaults
				false, // returnNoneDisplayed
				node,
				nodeTypeDescription,
			) ?? node.parameters;

		for (const credDesc of credentialDescriptions) {
			const shouldDisplay = NodeHelpers.displayParameter(
				nodeParametersWithDefaults,
				credDesc,
				node,
				nodeTypeDescription,
			);
			if (!shouldDisplay) continue;

			const existing = node.credentials?.[credDesc.name];
			if (existing?.id) continue;

			const candidates = credentialsByType.get(credDesc.name);
			if (!candidates?.length) continue;
			// Assign the first available credential
			node.credentials = node.credentials ?? {};
			node.credentials[credDesc.name] = {
				id: candidates[0].id,
				name: candidates[0].name,
			};

			assignments.push({
				nodeName: node.name,
				credentialName: candidates[0].name,
				credentialType: credDesc.name,
			});
		}
	}

	return { assignments, skippedHttpNodes };
}
