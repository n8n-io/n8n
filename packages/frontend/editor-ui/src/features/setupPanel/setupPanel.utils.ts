import type { IConnections } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';

import type {
	CredentialTypeSetupState,
	NodeCredentialRequirement,
	TriggerSetupState,
} from './setupPanel.types';

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
 * (each has a selected credential with no issues).
 */
export function isNodeSetupComplete(requirements: NodeCredentialRequirement[]): boolean {
	return requirements.every((req) => req.selectedCredentialId && req.issues.length === 0);
}

/**
 * Groups credential requirements across all nodes by credential type.
 * Returns one CredentialTypeSetupState per unique credential type.
 */
export function groupCredentialsByType(
	nodesWithCredentials: Array<{ node: INodeUi; credentialTypes: string[]; isTrigger: boolean }>,
	getCredentialDisplayName: (type: string) => string,
	isGenericAuthType: (type: string) => boolean,
): CredentialTypeSetupState[] {
	const map = new Map<string, CredentialTypeSetupState>();

	for (const { node, credentialTypes, isTrigger } of nodesWithCredentials) {
		for (const credType of credentialTypes) {
			const existing = map.get(credType);
			if (existing) {
				existing.nodeNames.push(node.name);

				if (isTrigger) {
					existing.triggerNodes.push(node);
				}

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
					nodeNames: [node.name],
					triggerNodes: isTrigger ? [node] : [],
					isComplete: false,
					isGenericAuth: isGenericAuthType(credType),
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
 */
export function isCredentialCardComplete(
	credState: CredentialTypeSetupState,
	hasTriggerExecuted: (nodeName: string) => boolean,
): boolean {
	const credentialComplete = !!credState.selectedCredentialId && credState.issues.length === 0;
	if (!credentialComplete) return false;
	return credState.triggerNodes.every((node) => hasTriggerExecuted(node.name));
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

/**
 * Sorts credential type states by the leftmost X position of any node that uses them.
 */
export function sortCredentialTypeStates(
	states: CredentialTypeSetupState[],
	getNodeByName: (name: string) => INodeUi | null | undefined,
): CredentialTypeSetupState[] {
	return [...states].sort((a, b) => {
		const aMinX = Math.min(
			...a.nodeNames.map((name) => getNodeByName(name)?.position[0] ?? Infinity),
		);
		const bMinX = Math.min(
			...b.nodeNames.map((name) => getNodeByName(name)?.position[0] ?? Infinity),
		);
		return aMinX - bMinX;
	});
}

interface SetupNode {
	node: INodeUi;
	isTrigger: boolean;
	credentialTypes: string[];
}

/**
 * Orders setup panel nodes by execution order, grouped by trigger.
 * Iterates triggers (sorted by X position), DFS-ing each trigger's subgraph
 * to collect downstream nodes in execution order (depth-first, matching the
 * backend v1 execution strategy). This lets users complete one full branch
 * before moving to the next. Nodes reachable from multiple triggers appear
 * only under the first trigger visited.
 * Orphaned nodes (not reachable from any trigger) are dropped.
 * When there are no triggers, returns an empty array.
 */
export function sortNodesByExecutionOrder(
	nodes: SetupNode[],
	connectionsBySourceNode: IConnections,
): SetupNode[] {
	const triggers = nodes
		.filter((item) => item.isTrigger)
		.sort((a, b) => a.node.position[0] - b.node.position[0]);

	if (triggers.length === 0) return [];

	const setupNodesByName = new Map<string, SetupNode>();
	for (const item of nodes) {
		setupNodesByName.set(item.node.name, item);
	}

	const result: SetupNode[] = [];
	const visited = new Set<string>();

	for (const trigger of triggers) {
		if (visited.has(trigger.node.name)) continue;
		visited.add(trigger.node.name);
		result.push(trigger);

		// DFS through all workflow connections from this trigger
		const dfs = (name: string) => {
			const nodeConns = connectionsBySourceNode[name];
			if (!nodeConns) return;
			for (const type of Object.keys(nodeConns)) {
				for (const outputs of nodeConns[type]) {
					for (const conn of outputs ?? []) {
						if (visited.has(conn.node)) continue;
						visited.add(conn.node);
						const setupNode = setupNodesByName.get(conn.node);
						if (setupNode) {
							result.push(setupNode);
						}
						dfs(conn.node);
					}
				}
			}
		};
		dfs(trigger.node.name);
	}

	return result;
}
