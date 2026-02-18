import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';

import type { NodeCredentialRequirement, NodeSetupState } from './setupPanel.types';

/**
 * Collects all credential types that a node requires from three sources:
 * 1. Node type definition — standard credentials with displayOptions
 * 2. Node issues — dynamic credentials (e.g. in HTTP Request node) that are missing or invalid
 * 3. Assigned credentials — dynamic credentials already properly set
 */
export function getNodeCredentialTypes(
	nodeTypeProvider: NodeTypeProvider,
	node: INodeUi,
): string[] {
	const credentialTypes = new Set<string>();

	const displayableCredentials = getNodeTypeDisplayableCredentials(nodeTypeProvider, node);
	for (const cred of displayableCredentials) {
		credentialTypes.add(cred.name);
	}

	const credentialIssues = node.issues?.credentials ?? {};
	for (const credType of Object.keys(credentialIssues)) {
		credentialTypes.add(credType);
	}

	if (node.credentials) {
		for (const credType of Object.keys(node.credentials)) {
			credentialTypes.add(credType);
		}
	}

	return Array.from(credentialTypes);
}

/**
 * Builds a single credential requirement entry for a node + credential type pair.
 */
export function buildCredentialRequirement(
	node: INodeUi,
	credentialType: string,
	getCredentialDisplayName: (type: string) => string,
	credentialTypeToNodeNames: Map<string, string[]>,
): NodeCredentialRequirement {
	const credValue = node.credentials?.[credentialType];
	const selectedCredentialId =
		typeof credValue === 'string' ? undefined : (credValue?.id ?? undefined);

	const credentialIssues = node.issues?.credentials ?? {};
	const issues = credentialIssues[credentialType];
	const issueMessages = [issues ?? []].flat();

	return {
		credentialType,
		credentialDisplayName: getCredentialDisplayName(credentialType),
		selectedCredentialId,
		issues: issueMessages,
		nodesWithSameCredential: credentialTypeToNodeNames.get(credentialType) ?? [],
	};
}

/**
 * Checks whether all credential requirements for a node are satisfied
 * (each has a selected credential with no issues and has been tested OK).
 */
export function isNodeSetupComplete(
	requirements: NodeCredentialRequirement[],
	isCredentialTestedOk?: (credentialId: string) => boolean,
): boolean {
	return requirements.every(
		(req) =>
			req.selectedCredentialId &&
			req.issues.length === 0 &&
			(isCredentialTestedOk?.(req.selectedCredentialId) ?? true),
	);
}

/**
 * Builds the full setup state for a single node: its credential requirements
 * and whether the node is fully configured.
 */
export function buildNodeSetupState(
	node: INodeUi,
	credentialTypes: string[],
	getCredentialDisplayName: (type: string) => string,
	credentialTypeToNodeNames: Map<string, string[]>,
	isTrigger = false,
	hasTriggerExecuted = false,
	isCredentialTestedOk?: (credentialId: string) => boolean,
): NodeSetupState {
	const credentialRequirements = credentialTypes.map((credType) =>
		buildCredentialRequirement(node, credType, getCredentialDisplayName, credentialTypeToNodeNames),
	);

	const credentialsConfigured = isNodeSetupComplete(credentialRequirements, isCredentialTestedOk);

	// For triggers: complete only after successful execution
	// For regular nodes: complete when credentials are configured
	const isComplete = isTrigger
		? credentialsConfigured && hasTriggerExecuted
		: credentialsConfigured;

	return {
		node,
		credentialRequirements,
		isComplete,
		isTrigger,
	};
}
