import { checkAiGatewayEligibility, type AiGatewayEligibilityReason } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { INode, INodeParameters } from 'n8n-workflow';
import { NodeHelpers, resolveSupportedCredentialActivation } from 'n8n-workflow';

import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { AI_GATEWAY_UNSUPPORTED_NODE_TYPES } from '@/features/ai/gateway/constants';

export interface GatewayOpportunity {
	nodeName: string;
	nodeType: string;
	credentialType: string;
	activationParameters: INodeParameters;
}

export interface GatewayBlockedNode {
	nodeName: string;
	nodeType: string;
	reason: AiGatewayEligibilityReason;
}

export interface GatewayScanResult {
	opportunities: GatewayOpportunity[];
	blocked: GatewayBlockedNode[];
	alreadyManagedCount: number;
}

// A new object for each call: a shared constant would let one caller's mutation
// leak into every later scan.
const emptyResult = (): GatewayScanResult => ({
	opportunities: [],
	blocked: [],
	alreadyManagedCount: 0,
});

/**
 * Plain-boolean wrapper around the store's `hasGatewayManagedCredential`. That
 * function is typed as a `node is INode` guard for its `INode | null` callers
 * elsewhere; called directly on our already-non-null `node`, TypeScript would
 * narrow the negative branch to `never` and break every later `node.*` access
 * in the scan loop. Losing the guard's return type here avoids that.
 */
function isGatewayManaged(
	hasGatewayManagedCredential: (node: INode | null) => node is INode,
	node: INode,
): boolean {
	return hasGatewayManagedCredential(node);
}

/**
 * Scans a workflow's nodes for ones that could switch to a Gateway credits
 * (managed) credential. Pure and synchronous — the caller must ensure the
 * gateway config is already loaded; this composable never fetches.
 */
export function useWorkflowGatewayScan(): {
	scanNodes: (nodes: INode[]) => GatewayScanResult;
} {
	const settingsStore = useSettingsStore();
	const aiGatewayStore = useAiGatewayStore();
	const nodeTypesStore = useNodeTypesStore();

	function scanNodes(nodes: INode[]): GatewayScanResult {
		const config = aiGatewayStore.config;
		if (!settingsStore.isAiGatewayEnabled || !config) {
			return emptyResult();
		}

		const opportunities: GatewayOpportunity[] = [];
		const blocked: GatewayBlockedNode[] = [];
		let alreadyManagedCount = 0;

		for (const node of nodes) {
			// A disabled node does not run, so switching its credential changes nothing.
			if (node.disabled) continue;

			if (isGatewayManaged(aiGatewayStore.hasGatewayManagedCredential, node)) {
				alreadyManagedCount++;
				continue;
			}

			if (AI_GATEWAY_UNSUPPORTED_NODE_TYPES.includes(node.type)) continue;

			const nodeTypeDescription = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeTypeDescription) continue;

			// Also covers the "sibling credential type" case where a node must switch
			// its `authentication` parameter to reach a gateway-supported credential.
			const activation = resolveSupportedCredentialActivation(
				nodeTypeDescription,
				node,
				aiGatewayStore.isCredentialTypeSupported,
			);
			if (!activation) continue;

			// Resolve parameters with node-type defaults applied, so a node relying on
			// its default action (e.g. an unset `resource`/`operation`) is judged
			// against the values it will actually run. See checkAiGatewayEligibility's
			// doc comment for why a defaults-resolved (not raw) parameter set matters.
			const resolvedParameters =
				NodeHelpers.getNodeParameters(
					nodeTypeDescription.properties ?? [],
					node.parameters,
					true,
					false,
					node,
					nodeTypeDescription,
				) ?? undefined;

			const eligibility = checkAiGatewayEligibility(
				node,
				activation.credentialType,
				config,
				resolvedParameters,
			);

			if (eligibility.eligible) {
				opportunities.push({
					nodeName: node.name,
					nodeType: node.type,
					credentialType: activation.credentialType,
					activationParameters: activation.parameters,
				});
			} else {
				blocked.push({
					nodeName: node.name,
					nodeType: node.type,
					reason: eligibility.reason,
				});
			}
		}

		return { opportunities, blocked, alreadyManagedCount };
	}

	return { scanNodes };
}
