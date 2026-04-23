import { type INodeCredentials, type INodeTypeDescription, NodeHelpers } from 'n8n-workflow';
import { HTTP_REQUEST_NODE_TYPE } from '@/app/constants';
import { getCredentialTypeName, isCredentialOnlyNodeType } from '@/app/utils/credentialOnlyNodes';
import { hasProxyAuth } from '@/app/utils/nodeTypeUtils';
import type { INodeUi } from '@/Interface';

export interface WorkflowDocumentNodeSerializationDeps {
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
}

export function useWorkflowDocumentNodeSerialization(deps: WorkflowDocumentNodeSerializationDeps) {
	function serializeNode(node: INodeUi): INodeUi {
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
		const nodeType = deps.getNodeType(node.type, node.typeVersion);

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

	return {
		serializeNode,
	};
}
