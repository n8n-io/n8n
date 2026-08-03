import type { AgentJsonToolConfig, AiGatewayConfigDto, NodeToolConfig } from '@n8n/api-types';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers, resolveSupportedCredentialActivation } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import { checkAiGatewayEligibility } from '@/services/ai-gateway-eligibility';

// Inlined to match the MCP auto-assign brand; see spec §11 for the pending dedup.
const AI_GATEWAY_MANAGED_CREDENTIAL_NAME = 'n8n credits';
const AI_GATEWAY_MANAGED_CREDENTIAL_FLAG = '__aiGatewayManaged';

type NodeToolCredential = NonNullable<NodeToolConfig['credentials']>[string];

function aiGatewayManagedCredential(): NodeToolCredential {
	return {
		id: null,
		name: AI_GATEWAY_MANAGED_CREDENTIAL_NAME,
		[AI_GATEWAY_MANAGED_CREDENTIAL_FLAG]: true,
	};
}

function setAiGatewayManagedCredential(
	node: NodeToolConfig,
	credentialType: string,
	activationParameters?: INodeParameters,
): void {
	node.credentials = node.credentials ?? {};
	node.credentials[credentialType] = aiGatewayManagedCredential();

	if (activationParameters && Object.keys(activationParameters).length > 0) {
		node.nodeParameters = { ...(node.nodeParameters ?? {}), ...activationParameters };
	}
}

function resolveNodeParameters(
	node: NodeToolConfig,
	description: INodeTypeDescription,
): INodeParameters {
	const rawParameters = (node.nodeParameters ?? {}) as INodeParameters;

	return (
		NodeHelpers.getNodeParameters(
			description.properties,
			rawParameters,
			true,
			false,
			{ typeVersion: node.nodeTypeVersion },
			description,
		) ?? rawParameters
	);
}

function isCredentialDisplayed(
	node: NodeToolConfig,
	description: INodeTypeDescription,
	credentialType: string,
	resolvedParameters: INodeParameters,
): boolean {
	const credentialDefinition = description.credentials?.find((c) => c.name === credentialType);
	if (!credentialDefinition) return true;

	return NodeHelpers.displayParameter(
		resolvedParameters,
		credentialDefinition,
		{ typeVersion: node.nodeTypeVersion },
		description,
	);
}

function reconcileAiGatewayManagedMarkers(
	node: NodeToolConfig,
	isEligible: (credentialType: string) => boolean,
): void {
	if (!node.credentials) return;

	for (const [slot, ref] of Object.entries(node.credentials)) {
		if (!(AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref)) continue;
		if (isEligible(slot)) node.credentials[slot] = aiGatewayManagedCredential();
		else delete node.credentials[slot];
	}
}

/**
 * Attach the AI Gateway-managed credential to eligible node-tool slots and
 * re-validate any inbound `__aiGatewayManaged` marker against live gateway
 * eligibility. Runs on every config write (the marker is server-assigned, so an
 * inbound one is untrusted until re-earned here). Real credentials win: a slot
 * with a stored id is never touched.
 */
export function reconcileNodeToolGatewayCredentials(
	tools: AgentJsonToolConfig[] | undefined,
	nodeTypes: NodeTypes,
	aiGatewayConfig: AiGatewayConfigDto | undefined,
): void {
	for (const tool of tools ?? []) {
		if (tool.type === 'node') reconcileNode(tool.node, nodeTypes, aiGatewayConfig);
	}
}

function reconcileNode(
	node: NodeToolConfig,
	nodeTypes: NodeTypes,
	aiGatewayConfig: AiGatewayConfigDto | undefined,
): void {
	let description: INodeTypeDescription;
	try {
		description = nodeTypes.getByNameAndVersion(node.nodeType, node.nodeTypeVersion).description;
	} catch {
		dropManagedMarkers(node);
		return;
	}

	let resolvedParameters = resolveNodeParameters(node, description);

	const eligibility = (credentialType: string) =>
		aiGatewayConfig === undefined
			? ({ eligible: false, reason: 'nodeNotCovered' } as const)
			: checkAiGatewayEligibility(
					{
						type: node.nodeType,
						typeVersion: node.nodeTypeVersion,
						parameters: (node.nodeParameters ?? {}) as INodeParameters,
					},
					credentialType,
					aiGatewayConfig,
					resolvedParameters,
				);

	const isEligible = (credentialType: string): boolean => eligibility(credentialType).eligible;

	const assignSupportedSiblingCredential = (credentialType: string): void => {
		if (aiGatewayConfig === undefined) return;

		const activation = resolveSupportedCredentialActivation(
			description,
			{ typeVersion: node.nodeTypeVersion, parameters: resolvedParameters },
			(candidateType) =>
				candidateType !== credentialType &&
				!node.credentials?.[candidateType]?.id &&
				isEligible(candidateType),
		);

		if (!activation) return;

		setAiGatewayManagedCredential(node, activation.credentialType, activation.parameters);
		resolvedParameters = resolveNodeParameters(node, description);
	};

	reconcileAiGatewayManagedMarkers(node, isEligible);

	if (aiGatewayConfig === undefined) return;

	for (const slot of getRequiredNodeCredentialSlots(description)) {
		const credentialType = slot.credentialType;
		if (node.credentials?.[credentialType]) continue;

		if (!isCredentialDisplayed(node, description, credentialType, resolvedParameters)) continue;

		const slotEligibility = eligibility(credentialType);
		if (slotEligibility.eligible) {
			setAiGatewayManagedCredential(node, credentialType);
			continue;
		}

		assignSupportedSiblingCredential(credentialType);
	}
}

function dropManagedMarkers(node: NodeToolConfig): void {
	if (!node.credentials) return;
	for (const [slot, ref] of Object.entries(node.credentials)) {
		if (AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref) delete node.credentials[slot];
	}
}
