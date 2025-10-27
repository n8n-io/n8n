import {
	AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
	AI_MCP_TOOL_NODE_TYPE,
	WIKIPEDIA_TOOL_NODE_TYPE,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/utils/nodeTypes/nodeTypeTransforms';
import type {
	INodeCredentialDescription,
	FromAIArgument,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeHelpers, traverseNodeParameters } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

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
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters,
			true,
			false,
			node,
			nodeType,
		) ?? node.parameters;

	const displayableCredentials = nodeTypeCreds.filter((credentialTypeDescription) => {
		return NodeHelpers.displayParameter(nodeParameters, credentialTypeDescription, node, nodeType);
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

/**
 * Checks if the given node needs agentInput
 */
export function needsAgentInput(node: Pick<INodeUi, 'parameters' | 'type'>) {
	const nodeTypesNeedModal = [
		WIKIPEDIA_TOOL_NODE_TYPE,
		AI_MCP_TOOL_NODE_TYPE,
		AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
	];
	const collectedArgs: FromAIArgument[] = [];
	traverseNodeParameters(node.parameters, collectedArgs);
	return (
		collectedArgs.length > 0 ||
		nodeTypesNeedModal.includes(node.type) ||
		(node.type.includes('vectorStore') && node.parameters?.mode === 'retrieve-as-tool')
	);
}

/**
 * Filters out options that should not be displayed
 */
export function getParameterDisplayableOptions(
	options: INodePropertyOptions[],
	node: INodeUi | null,
): INodePropertyOptions[] {
	if (!node) return options;

	const nodeType = node?.type ? useNodeTypesStore().getNodeType(node.type, node.typeVersion) : null;

	if (!nodeType || !Array.isArray(nodeType.properties)) return options;

	const nodeParameters =
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters,
			true,
			false,
			node,
			nodeType,
		) ?? node.parameters;

	return options.filter((option) => {
		if (!option.displayOptions && !option.disabledOptions) return true;

		return NodeHelpers.displayParameter(
			nodeParameters,
			option,
			node,
			nodeType,
			undefined,
			'displayOptions',
		);
	});
}
