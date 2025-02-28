import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/utils/nodeTypes/nodeTypeTransforms';
import type { INodeCredentialDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

/**
 * Returns the credentials that are displayable for the given node.
 */
export function getNodeTypeDisplayableCredentials(
	nodeTypeProvider: NodeTypeProvider,
	node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion'>,
): INodeCredentialDescription[] {
	const nodeType = nodeTypeProvider.getNodeType(node.type, node.typeVersion);
	if (!nodeType?.credentials) {
		return [];
	}

	const nodeTypeCreds = nodeType.credentials;

	// We must populate the node's parameters with the default values
	// before we can check which credentials are available, because
	// credentials can have conditional requirements that depend on
	// node parameters.
	const nodeParameters =
		NodeHelpers.getNodeParameters(nodeType.properties, node.parameters, true, false, node) ??
		node.parameters;

	const displayableCredentials = nodeTypeCreds.filter((credentialTypeDescription) => {
		return NodeHelpers.displayParameter(nodeParameters, credentialTypeDescription, node);
	});

	return displayableCredentials;
}

/**
 * Checks if the given node has credentials that can be filled.
 */
export function doesNodeHaveCredentialsToFill(
	nodeTypeProvider: NodeTypeProvider,
	node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion'>,
): boolean {
	const requiredCredentials = getNodeTypeDisplayableCredentials(nodeTypeProvider, node);

	return requiredCredentials.length > 0;
}

/**
 * Does node has the given credential filled
 *
 * @param credentialName E.g. "telegramApi"
 */
export function hasNodeCredentialFilled(
	node: Pick<INodeUi, 'credentials'>,
	credentialName: string,
): boolean {
	if (!node.credentials) {
		return false;
	}

	return !!node.credentials[credentialName];
}

/**
 * Checks if the given node has all credentials filled.
 */
export function doesNodeHaveAllCredentialsFilled(
	nodeTypeProvider: NodeTypeProvider,
	node: Pick<INodeUi, 'parameters' | 'type' | 'typeVersion' | 'credentials'>,
): boolean {
	const requiredCredentials = getNodeTypeDisplayableCredentials(nodeTypeProvider, node);

	return requiredCredentials.every((cred) => hasNodeCredentialFilled(node, cred.name));
}
