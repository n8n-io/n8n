import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';

import type {
	CredentialTypeSetupState,
	TriggerSetupState,
} from '@/features/setupPanel/setupPanel.types';

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
 * Groups credential requirements across all nodes by credential type.
 * Returns one CredentialTypeSetupState per unique credential type.
 */
export function groupCredentialsByType(
	nodesWithCredentials: Array<{ node: INodeUi; credentialTypes: string[] }>,
	getCredentialDisplayName: (type: string) => string,
): CredentialTypeSetupState[] {
	const map = new Map<string, CredentialTypeSetupState>();

	for (const { node, credentialTypes } of nodesWithCredentials) {
		for (const credType of credentialTypes) {
			const existing = map.get(credType);
			if (existing) {
				existing.nodes.push(node);

				const nodeIssues = node.issues?.credentials?.[credType];
				if (nodeIssues) {
					const issueMessages = [nodeIssues].flat();
					for (const msg of issueMessages) {
						if (!existing.issues.includes(msg)) {
							existing.issues.push(msg);
						}
					}
				}

				if (!existing.selectedCredentialId) {
					const credValue = node.credentials?.[credType];
					if (typeof credValue !== 'string' && credValue?.id) {
						existing.selectedCredentialId = credValue.id;
					}
				}
			} else {
				const credValue = node.credentials?.[credType];
				const selectedCredentialId =
					typeof credValue === 'string' ? undefined : (credValue?.id ?? undefined);

				const credentialIssues = node.issues?.credentials ?? {};
				const issues = credentialIssues[credType];
				const issueMessages = [issues ?? []].flat();

				map.set(credType, {
					credentialType: credType,
					credentialDisplayName: getCredentialDisplayName(credType),
					selectedCredentialId,
					issues: issueMessages,
					nodes: [node],
					isComplete: false,
				});
			}
		}
	}

	for (const state of map.values()) {
		state.isComplete = !!state.selectedCredentialId && state.issues.length === 0;
	}

	return Array.from(map.values());
}

/**
 * Checks whether a credential card is fully complete.
 * For cards with embedded triggers, complete = credential set + no issues + all triggers executed.
 * When isCredentialTestedOk is provided, also checks that the credential has passed testing.
 */
export function isCredentialCardComplete(
	credState: CredentialTypeSetupState,
	hasTriggerExecuted: (nodeName: string) => boolean,
	isTriggerNode: (nodeType: string) => boolean,
	isCredentialTestedOk?: (credentialId: string) => boolean,
): boolean {
	const credentialComplete = !!credState.selectedCredentialId && credState.issues.length === 0;
	if (!credentialComplete) return false;

	if (
		isCredentialTestedOk &&
		credState.selectedCredentialId &&
		!isCredentialTestedOk(credState.selectedCredentialId)
	) {
		return false;
	}

	const triggerNodes = credState.nodes.filter((node) => isTriggerNode(node.type));
	return triggerNodes.every((node) => hasTriggerExecuted(node.name));
}

/**
 * Builds the setup state for a trigger card.
 * Complete when: trigger has been executed AND all its credential types are satisfied.
 */
export function buildTriggerSetupState(
	node: INodeUi,
	triggerCredentialTypes: string[],
	credentialTypeStates: CredentialTypeSetupState[],
	hasTriggerExecuted: boolean,
): TriggerSetupState {
	const allCredentialsComplete = triggerCredentialTypes.every((credType) => {
		const credState = credentialTypeStates.find((s) => s.credentialType === credType);
		return credState ? !!credState.selectedCredentialId && credState.issues.length === 0 : true;
	});

	return {
		node,
		isComplete: allCredentialsComplete && hasTriggerExecuted,
	};
}
