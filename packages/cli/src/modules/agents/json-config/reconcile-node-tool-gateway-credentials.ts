import type { AgentJsonToolConfig, AiGatewayConfigDto, NodeToolConfig } from '@n8n/api-types';
import { getRequiredNodeCredentialSlots } from '@n8n/ai-utilities/node-catalog';
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers, resolveSupportedCredentialActivation } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import { checkAiGatewayEligibility, HTTP_NODE_TYPES } from '@/services/ai-gateway-eligibility';

const N8N_CONNECT_CREDENTIAL_NAME = 'n8n credits';
const AI_GATEWAY_MANAGED_CREDENTIAL_FLAG = '__aiGatewayManaged';

type NodeToolCredential = NonNullable<NodeToolConfig['credentials']>[string];

function aiGatewayManagedCredential(): NodeToolCredential {
	return {
		id: null,
		name: N8N_CONNECT_CREDENTIAL_NAME,
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

/** Returns whether node parameters were changed by slot activation. */
function reconcileAiGatewayManagedMarkers(
	node: NodeToolConfig,
	description: INodeTypeDescription,
	isEligible: (credentialType: string) => boolean,
): boolean {
	if (!node.credentials) return false;

	let parametersChanged = false;
	for (const [slot, ref] of Object.entries(node.credentials)) {
		if (!(AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref)) continue;
		if (!isEligible(slot)) {
			delete node.credentials[slot];
			continue;
		}
		// A kept marker can sit on a slot the node's parameters don't select
		// (e.g. an API-key marker while `authentication` still points at OAuth),
		// which leaves it inert: activate the marked type the same way sibling
		// auto-assignment does. Slots the description doesn't declare (e.g. HTTP
		// predefined credential types) resolve no activation and are kept as-is.
		const activation = resolveSupportedCredentialActivation(
			description,
			{ typeVersion: node.nodeTypeVersion, parameters: resolveNodeParameters(node, description) },
			(candidateType) => candidateType === slot,
		);
		setAiGatewayManagedCredential(node, slot, activation?.parameters);
		if (activation && Object.keys(activation.parameters).length > 0) parametersChanged = true;
	}
	return parametersChanged;
}

/**
 * Attach the AI Gateway-managed credential to eligible node-tool slots and
 * re-validate any inbound `__aiGatewayManaged` marker against live gateway
 * eligibility. Runs on every config write (the marker is server-assigned, so an
 * inbound one is untrusted until re-earned here). Real credentials win: a slot
 * with a stored id is never touched, and auto-assignment skips types the
 * project owns a credential for. An inbound marker is exempt from that
 * precedence — it is an explicit opt-in and only has to stay eligible.
 */
export function reconcileNodeToolGatewayCredentials(
	tools: AgentJsonToolConfig[] | undefined,
	nodeTypes: NodeTypes,
	aiGatewayConfig: AiGatewayConfigDto | undefined,
	ownedCredentialTypes: ReadonlySet<string>,
): void {
	for (const tool of tools ?? []) {
		if (tool.type === 'node') {
			reconcileNode(tool.node, nodeTypes, aiGatewayConfig, ownedCredentialTypes);
		}
	}
}

/**
 * Credential types whose every required, displayed node-tool slot is already
 * satisfied (managed marker or a real id) — the finish_setup credential card
 * for such a type is redundant and can be dropped.
 *
 * A type is EXCLUDED when any tool still has an empty required slot of it, even
 * if another tool runs it on n8n credits: coverage is per node/operation, so a
 * covered operation and an uncovered one can share a credential type, and the
 * uncovered one must keep prompting for a real credential.
 */
export function listAiGatewayManagedCredentialTypes(
	tools: AgentJsonToolConfig[] | undefined,
	nodeTypes: NodeTypes,
): string[] {
	const managed = new Set<string>();
	const unsatisfied = new Set<string>();

	for (const tool of tools ?? []) {
		if (tool.type !== 'node') continue;
		const node = tool.node;

		let description: INodeTypeDescription;
		try {
			description = nodeTypes.getByNameAndVersion(node.nodeType, node.nodeTypeVersion).description;
		} catch {
			continue;
		}

		for (const [credentialType, ref] of Object.entries(node.credentials ?? {})) {
			if (AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref) managed.add(credentialType);
		}

		const resolvedParameters = resolveNodeParameters(node, description);
		for (const slot of getRequiredNodeCredentialSlots(description)) {
			const credentialType = slot.credentialType;
			const ref = node.credentials?.[credentialType];
			if (ref && (ref.id || AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref)) continue;
			if (isCredentialDisplayed(node, description, credentialType, resolvedParameters)) {
				unsatisfied.add(credentialType);
			}
		}
	}

	return [...managed].filter((credentialType) => !unsatisfied.has(credentialType));
}

function reconcileNode(
	node: NodeToolConfig,
	nodeTypes: NodeTypes,
	aiGatewayConfig: AiGatewayConfigDto | undefined,
	ownedCredentialTypes: ReadonlySet<string>,
): void {
	let description: INodeTypeDescription;
	try {
		description = nodeTypes.getByNameAndVersion(node.nodeType, node.nodeTypeVersion).description;
	} catch {
		dropAiGatewayMarkers(node);
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
				!ownedCredentialTypes.has(candidateType) &&
				isEligible(candidateType),
		);

		if (!activation) return;

		setAiGatewayManagedCredential(node, activation.credentialType, activation.parameters);
		resolvedParameters = resolveNodeParameters(node, description);
	};

	if (reconcileAiGatewayManagedMarkers(node, description, isEligible)) {
		resolvedParameters = resolveNodeParameters(node, description);
	}

	if (aiGatewayConfig === undefined) return;
	if (HTTP_NODE_TYPES.has(node.nodeType)) return;

	for (const slot of getRequiredNodeCredentialSlots(description)) {
		const credentialType = slot.credentialType;
		// A ref only occupies the slot with a real id or the managed flag —
		// sanitization clears inaccessible ids to '', leaving the slot empty.
		const existing = node.credentials?.[credentialType];
		if (existing && (existing.id || AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in existing)) continue;

		// Own credential wins (same precedence as MCP and model slots): leave the
		// slot empty so the builder resolves the user's credential instead.
		if (ownedCredentialTypes.has(credentialType)) continue;

		if (!isCredentialDisplayed(node, description, credentialType, resolvedParameters)) continue;

		const slotEligibility = eligibility(credentialType);
		if (slotEligibility.eligible) {
			setAiGatewayManagedCredential(node, credentialType);
			continue;
		}

		assignSupportedSiblingCredential(credentialType);
	}
}

function dropAiGatewayMarkers(node: NodeToolConfig): void {
	if (!node.credentials) return;
	for (const [slot, ref] of Object.entries(node.credentials)) {
		if (AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref) delete node.credentials[slot];
	}
}
