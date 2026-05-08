import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';
import { HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { isExpression } from '@/app/utils/expressions';

export const isHttpRequestNodeType = (nodeType: string): boolean =>
	nodeType === HTTP_REQUEST_NODE_TYPE || nodeType === HTTP_REQUEST_TOOL_NODE_TYPE;

import type {
	CredentialTypeSetupState,
	NodeGroupItem,
	NodeSetupState,
	SetupCardItem,
	TriggerSetupState,
} from '@/features/setupPanel/setupPanel.types';
import { type INode, type INodeParameters, type INodeProperties, NodeHelpers } from 'n8n-workflow';

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

export function getNodeParametersIssues(nodeTypesStore: NodeTypeProvider, node: INode) {
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	if (!nodeType) return {};

	// Fill in default values for parameters not explicitly set on the node.
	// Required parameters with valid defaults (e.g. binaryPropertyName: 'data')
	// are not stored in node.parameters when the user hasn't changed them.
	// Without this, the issue checker flags them as missing.
	const paramsWithDefaults: INodeParameters = { ...node.parameters };
	for (const prop of nodeType.properties) {
		if (!(prop.name in paramsWithDefaults) && prop.default !== undefined) {
			paramsWithDefaults[prop.name] = prop.default;
		}
	}

	const nodeWithDefaults: INode = { ...node, parameters: paramsWithDefaults };
	const issues = NodeHelpers.getNodeParametersIssues(
		nodeType.properties,
		nodeWithDefaults,
		nodeType,
	);
	const allIssues = issues?.parameters ?? {};

	// Only keep issues for top-level parameters that the setup card can display
	// AND that are actually visible given the current parameter values.
	// Nested issues (e.g. a missing field inside a fixedCollection entry) use child
	// property names as keys which don't match top-level properties and can't be
	// configured in the setup card.
	// Some node types define duplicate parameter names with different displayOptions
	// (e.g. "event" shown for different triggerOn values). We group all variants per
	// name so we can check whether ANY variant is currently displayed.
	const topLevelPropsByName = new Map<string, INodeProperties[]>();
	for (const prop of nodeType.properties) {
		const existing = topLevelPropsByName.get(prop.name);
		if (existing) {
			existing.push(prop);
		} else {
			topLevelPropsByName.set(prop.name, [prop]);
		}
	}
	const filteredIssues: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(allIssues)) {
		const props = topLevelPropsByName.get(key);
		if (!props) continue;

		// Check if any variant of this parameter is visible
		const isDisplayed = props.some((prop) => {
			// Skip hidden parameters — they are never shown to the user
			if (prop.type === 'hidden') return false;

			// Skip parameters whose displayOptions evaluate to hidden.
			// NodeHelpers.getParameterIssues already checks this internally, but it
			// treats expression values in controlling parameters as "always show".
			// This explicit check ensures consistency with the NDV's display logic.
			if (
				prop.displayOptions &&
				!NodeHelpers.displayParameter(paramsWithDefaults, prop, nodeWithDefaults, nodeType)
			) {
				return false;
			}

			return true;
		});
		if (!isDisplayed) continue;

		filteredIssues[key] = value;
	}
	return filteredIssues;
}

/**
 * Groups credential requirements across all nodes by credential type.
 * Returns one CredentialTypeSetupState per unique credential type.
 *
 * For HTTP Request nodes, grouping is by credential type + URL. When the URL is an expression,
 * the optional resolveExpressionUrl callback attempts to resolve it. If resolution succeeds
 * (e.g. static expressions or those using only environment variables), the resolved value
 * is used for grouping. Otherwise each node gets its own card.
 */
export function groupCredentialsByType(
	nodesWithCredentials: Array<{ node: INodeUi; credentialTypes: string[] }>,
	getCredentialDisplayName: (type: string) => string,
	resolveExpressionUrl?: (expressionUrl: string, nodeName: string) => string | null,
): CredentialTypeSetupState[] {
	const map = new Map<string, CredentialTypeSetupState>();

	for (const { node, credentialTypes } of nodesWithCredentials) {
		for (const credType of credentialTypes) {
			// HTTP Request nodes are grouped by matching URL (same credential type + same URL
			// share a card). Nodes with different URLs get separate cards because they likely
			// target different APIs even when using the same credential type.
			// Expression URLs are resolved when possible (e.g. static expressions or those
			// using only environment variables). Unresolvable expressions get their own card.
			const isHttpRequest = isHttpRequestNodeType(node.type);
			const url = node.parameters.url;

			let mapKey: string;
			if (!isHttpRequest) {
				mapKey = credType;
			} else if (isExpression(url)) {
				const resolvedUrl = resolveExpressionUrl?.(url, node.name) ?? null;
				mapKey =
					resolvedUrl !== null
						? `${credType}:http:${resolvedUrl}`
						: `${credType}:http:${node.name}`;
			} else {
				mapKey = `${credType}:http:${String(url ?? '')}`;
			}

			const existing = map.get(mapKey);
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

				map.set(mapKey, {
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

/** Callbacks needed by completion checks */
export interface CompletionContext {
	firstTriggerName: string | null;
	hasTriggerExecuted: (nodeName: string) => boolean;
	isTriggerNode: (nodeType: string) => boolean;
	isCredentialTestedOk?: (credentialId: string) => boolean;
	hasUnfilledTemplateParams: (node: INodeUi) => boolean;
}

/**
 * Single source of truth for whether a per-node setup card is complete.
 * Handles credential, parameter, and trigger checks uniformly.
 */
export function isNodeSetupComplete(
	state: Pick<
		NodeSetupState,
		'credentialType' | 'selectedCredentialId' | 'issues' | 'parameterIssues' | 'isTrigger' | 'node'
	>,
	ctx: CompletionContext,
): boolean {
	// Credential check
	if (state.credentialType) {
		if (!state.selectedCredentialId || (state.issues?.length ?? 0) > 0) return false;
		if (
			ctx.isCredentialTestedOk &&
			state.selectedCredentialId &&
			!ctx.isCredentialTestedOk(state.selectedCredentialId)
		) {
			return false;
		}
	}

	// Parameter check
	if (Object.keys(state.parameterIssues).length > 0 || ctx.hasUnfilledTemplateParams(state.node)) {
		return false;
	}

	// Trigger check: only the first trigger requires execution
	if (
		state.isTrigger &&
		state.node.name === ctx.firstTriggerName &&
		!ctx.hasTriggerExecuted(state.node.name)
	) {
		return false;
	}

	return true;
}

/**
 * Checks whether a grouped credential card is fully complete.
 * For cards with embedded triggers, complete = credential set + no issues + test ok + all first-triggers executed.
 */
export function isCredentialCardComplete(
	credState: CredentialTypeSetupState,
	ctx: CompletionContext,
): boolean {
	const credentialComplete = !!credState.selectedCredentialId && credState.issues.length === 0;
	if (!credentialComplete) return false;

	if (
		ctx.isCredentialTestedOk &&
		credState.selectedCredentialId &&
		!ctx.isCredentialTestedOk(credState.selectedCredentialId)
	) {
		return false;
	}

	// Only the first trigger in the group needs to have executed
	const triggerNodes = credState.nodes.filter(
		(node) => ctx.isTriggerNode(node.type) && node.name === ctx.firstTriggerName,
	);
	return triggerNodes.every((node) => ctx.hasTriggerExecuted(node.name));
}

/**
 * Builds the setup state for a standalone trigger card.
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

export function isCardComplete(card: SetupCardItem): boolean {
	if (card.nodeGroup) {
		const { parentState, subnodeCards } = card.nodeGroup;
		return (!parentState || parentState.isComplete) && subnodeCards.every((c) => c.isComplete);
	}
	return card.state.isComplete;
}

export function isNodeGroupCard(
	card: SetupCardItem,
): card is { nodeGroup: NodeGroupItem; state?: undefined } {
	return !!card.nodeGroup;
}
