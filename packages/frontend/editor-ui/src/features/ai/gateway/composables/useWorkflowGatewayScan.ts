import {
	checkAiGatewayEligibility,
	getSelectedModel,
	type AiGatewayConfigDto,
	type AiGatewayEligibilityReason,
} from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { INode, INodeParameters } from 'n8n-workflow';
import { NodeHelpers, resolveSupportedCredentialActivation } from 'n8n-workflow';

import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { AI_GATEWAY_UNSUPPORTED_NODE_TYPES } from '@/features/ai/gateway/constants';
import { isNodeGatewayManaged } from '@/features/ai/gateway/utils/managedCredential';

export type GatewayOpportunityCaveat =
	| 'unsupportedAction'
	| 'unsupportedModel'
	| 'hiddenPropertySet';

export interface GatewayOpportunity {
	nodeName: string;
	nodeType: string;
	credentialType: string;
	activationParameters: INodeParameters;
	/** Set when the node type is supported but its current configuration is not. */
	caveat?: GatewayOpportunityCaveat;
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
 * Checks the model a node has selected against the gateway's allowlist for its
 * credential type. Returns 'unsupportedModel' only when a model is selected and
 * that model is not on the list. Returns undefined (no caveat) when the gateway
 * has no model allowlist at all, has none for this credential type, or the node
 * has no model selected — an unspecified model must not be flagged.
 */
function resolveModelCaveat(
	config: AiGatewayConfigDto,
	credentialType: string,
	resolvedParameters: INodeParameters | undefined,
): GatewayOpportunityCaveat | undefined {
	const models = config.supportedModels?.[credentialType];
	if (!models) return undefined;

	const selected = getSelectedModel(resolvedParameters);
	if (selected === undefined) return undefined;

	return models.includes(selected) ? undefined : 'unsupportedModel';
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

			if (isNodeGatewayManaged(aiGatewayStore.hasGatewayManagedCredential, node)) {
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

			const opportunityBase = {
				nodeName: node.name,
				nodeType: node.type,
				credentialType: activation.credentialType,
				activationParameters: activation.parameters,
			};

			if (eligibility.eligible) {
				const caveat = resolveModelCaveat(config, activation.credentialType, resolvedParameters);
				opportunities.push(caveat ? { ...opportunityBase, caveat } : opportunityBase);
				continue;
			}

			switch (eligibility.reason) {
				case 'nodeNotCovered':
				case 'credentialTypeNotCovered':
				case 'versionTooLow':
					// The node type itself is not supported: not offered as an opportunity.
					blocked.push({ nodeName: node.name, nodeType: node.type, reason: eligibility.reason });
					break;
				case 'hiddenPropertySet':
					// By definition the user set the offending property.
					opportunities.push({ ...opportunityBase, caveat: 'hiddenPropertySet' });
					break;
				case 'unsupportedAction': {
					// The reason alone can't tell "no action selected" from "an unsupported
					// action selected" — inspect the resolved operation ourselves. An
					// unspecified action must not be flagged.
					const operation = resolvedParameters?.operation;
					const hasSelectedOperation = typeof operation === 'string' && operation.length > 0;
					opportunities.push(
						hasSelectedOperation
							? { ...opportunityBase, caveat: 'unsupportedAction' }
							: opportunityBase,
					);
					break;
				}
			}
		}

		return { opportunities, blocked, alreadyManagedCount };
	}

	return { scanNodes };
}
