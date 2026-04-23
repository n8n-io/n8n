import {
	AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
	AI_MCP_TOOL_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	WIKIPEDIA_TOOL_NODE_TYPE,
} from '@/app/constants';
import type { INodeUi } from '@/Interface';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import type {
	INodeCredentialDescription,
	INodeCredentials,
	FromAIArgument,
	INodePropertyOptions,
} from 'n8n-workflow';
import { isHitlToolType, NodeHelpers, traverseNodeParameters } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getCredentialTypeName, isCredentialOnlyNodeType } from '@/app/utils/credentialOnlyNodes';
import { hasProxyAuth } from '@/app/utils/nodeTypesUtils';

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

export const TOOL_NODE_TYPES_NEED_INPUT = [
	WIKIPEDIA_TOOL_NODE_TYPE,
	AI_MCP_TOOL_NODE_TYPE,
	AI_CODE_TOOL_LANGCHAIN_NODE_TYPE,
];
/**
 * Checks if the given node needs agentInput
 */
export function needsAgentInput(node: Pick<INodeUi, 'parameters' | 'type'>) {
	const collectedArgs: FromAIArgument[] = [];
	traverseNodeParameters(node.parameters, collectedArgs);
	return (
		collectedArgs.length > 0 ||
		TOOL_NODE_TYPES_NEED_INPUT.includes(node.type) ||
		(node.type.includes('vectorStore') && node.parameters?.mode === 'retrieve-as-tool') ||
		isHitlToolType(node.type)
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

/**
 * Serializes a node for persistence: strips transient UI state, resolves
 * default parameters via the node type definition, and retains only the
 * credentials that are currently displayable.
 */
export function serializeNode(nodeTypeProvider: NodeTypeProvider, node: INodeUi): INodeUi {
	const skipKeys = [
		'color',
		'continueOnFail',
		'credentials',
		'disabled',
		'issues',
		'onError',
		'notes',
		'parameters',
		'status',
	];

	// @ts-ignore
	const nodeData: INodeUi = {
		parameters: {},
	};

	for (const key in node) {
		if (key.charAt(0) !== '_' && skipKeys.indexOf(key) === -1) {
			// @ts-ignore
			nodeData[key] = node[key];
		}
	}

	// Get the data of the node type that we can get the default values
	// TODO: Later also has to care about the node-type-version as defaults could be different
	const nodeType = nodeTypeProvider.getNodeType(node.type, node.typeVersion);

	if (nodeType !== null) {
		const isCredentialOnly = isCredentialOnlyNodeType(nodeType.name);

		if (isCredentialOnly) {
			nodeData.type = HTTP_REQUEST_NODE_TYPE;
			nodeData.extendsCredential = getCredentialTypeName(nodeType.name);
		}

		// Node-Type is known so we can save the parameters correctly
		const nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			node.parameters,
			isCredentialOnly,
			false,
			node,
			nodeType,
		);
		nodeData.parameters = nodeParameters !== null ? nodeParameters : {};

		// Add the node credentials if there are some set and if they should be displayed
		if (node.credentials !== undefined && nodeType.credentials !== undefined) {
			const saveCredentials: INodeCredentials = {};
			for (const nodeCredentialTypeName of Object.keys(node.credentials)) {
				if (hasProxyAuth(node) || Object.keys(node.parameters).includes('genericAuthType')) {
					saveCredentials[nodeCredentialTypeName] = node.credentials[nodeCredentialTypeName];
					continue;
				}

				const credentialTypeDescription = nodeType.credentials
					// filter out credentials with same name in different node versions
					.filter((c) => NodeHelpers.displayParameterPath(node.parameters, c, '', node, nodeType))
					.find((c) => c.name === nodeCredentialTypeName);

				if (credentialTypeDescription === undefined) {
					// Credential type is not know so do not save
					continue;
				}

				if (
					!NodeHelpers.displayParameterPath(
						node.parameters,
						credentialTypeDescription,
						'',
						node,
						nodeType,
					)
				) {
					// Credential should not be displayed so do also not save
					continue;
				}

				saveCredentials[nodeCredentialTypeName] = node.credentials[nodeCredentialTypeName];
			}

			// Set credential property only if it has content
			if (Object.keys(saveCredentials).length !== 0) {
				nodeData.credentials = saveCredentials;
			}
		}
	} else {
		// Node-Type is not known so save the data as it is
		nodeData.credentials = node.credentials;
		nodeData.parameters = node.parameters;
		if (nodeData.color !== undefined) {
			nodeData.color = node.color;
		}
	}

	// Save the disabled property, continueOnFail and onError only when is set
	if (node.disabled === true) {
		nodeData.disabled = true;
	}
	if (node.continueOnFail === true) {
		nodeData.continueOnFail = true;
	}
	if (node.onError !== 'stopWorkflow') {
		nodeData.onError = node.onError;
	}
	// Save the notes only if when they contain data
	if (![undefined, ''].includes(node.notes)) {
		nodeData.notes = node.notes;
	}

	return nodeData;
}
