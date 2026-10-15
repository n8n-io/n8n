import type { NodeToolConfig } from '@n8n/api-types';
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

export const AI_GATEWAY_MANAGED_CREDENTIAL_FLAG = '__aiGatewayManaged';

export type NodeToolCredential = NonNullable<NodeToolConfig['credentials']>[string];

/** Returns undefined when the node type is not installed. */
export function getNodeToolDescription(
	node: NodeToolConfig,
	nodeTypes: NodeTypes,
): INodeTypeDescription | undefined {
	try {
		return nodeTypes.getByNameAndVersion(node.nodeType, node.nodeTypeVersion).description;
	} catch {
		return undefined;
	}
}

/** The node's parameters with the defaults of the node type filled in. */
export function resolveNodeParameters(
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

export function isCredentialDisplayed(
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

/**
 * A slot is filled by a stored credential id or by the Gateway credits marker.
 * Sanitization clears an inaccessible id to '', which leaves the slot empty.
 */
export function isCredentialSlotFilled(ref: NodeToolCredential | undefined): boolean {
	return ref !== undefined && (Boolean(ref.id) || AI_GATEWAY_MANAGED_CREDENTIAL_FLAG in ref);
}
