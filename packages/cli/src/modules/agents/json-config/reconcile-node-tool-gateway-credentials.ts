import type { AgentJsonToolConfig, AiGatewayConfigDto, NodeToolConfig } from '@n8n/api-types';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { checkAiGatewayEligibility } from '@/services/ai-gateway-eligibility';

// Inlined to match the MCP auto-assign brand; see spec §11 for the pending dedup.
const N8N_CONNECT_CREDENTIAL_NAME = 'n8n credits';

function managedSentinel(): NonNullable<NodeToolConfig['credentials']>[string] {
	return { id: null, name: N8N_CONNECT_CREDENTIAL_NAME, __aiGatewayManaged: true };
}

/**
 * Attach the n8n Connect managed credential to eligible node-tool slots and
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

	const rawParameters = (node.nodeParameters ?? {}) as INodeParameters;
	const resolvedParameters =
		(NodeHelpers.getNodeParameters(
			description.properties,
			rawParameters,
			true,
			false,
			{ typeVersion: node.nodeTypeVersion },
			description,
		) as INodeParameters | null) ?? rawParameters;

	const isEligible = (credentialType: string): boolean =>
		aiGatewayConfig !== undefined &&
		checkAiGatewayEligibility(
			{ type: node.nodeType, typeVersion: node.nodeTypeVersion, parameters: rawParameters },
			credentialType,
			aiGatewayConfig,
			resolvedParameters,
		).eligible;

	// An eligible inbound marker is canonicalized to the sentinel; the rest are dropped.
	for (const [slot, ref] of Object.entries(node.credentials ?? {})) {
		if (!('__aiGatewayManaged' in ref)) continue;
		if (isEligible(slot)) node.credentials![slot] = managedSentinel();
		else delete node.credentials![slot];
	}

	if (aiGatewayConfig === undefined) return;

	for (const slot of getRequiredNodeCredentialSlots(description)) {
		const credentialType = slot.credentialType;
		if (node.credentials?.[credentialType]) continue;

		const credentialDefinition = description.credentials?.find((c) => c.name === credentialType);
		if (
			credentialDefinition &&
			!NodeHelpers.displayParameter(
				resolvedParameters,
				credentialDefinition,
				{ typeVersion: node.nodeTypeVersion },
				description,
			)
		) {
			continue;
		}

		if (isEligible(credentialType)) {
			node.credentials = node.credentials ?? {};
			node.credentials[credentialType] = managedSentinel();
		}
	}
}

function dropManagedMarkers(node: NodeToolConfig): void {
	if (!node.credentials) return;
	for (const [slot, ref] of Object.entries(node.credentials)) {
		if ('__aiGatewayManaged' in ref) delete node.credentials[slot];
	}
}
