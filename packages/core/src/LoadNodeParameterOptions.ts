import type {
	ILoadOptions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { RoutingNode } from 'n8n-workflow';

import * as NodeExecuteFunctions from './NodeExecuteFunctions';
import { LoadNodeDetails } from './LoadNodeDetails';

export class LoadNodeParameterOptions extends LoadNodeDetails {
	/**
	 * Returns the available options via a predefined method
	 */
	async getOptionsViaMethodName(
		methodName: string,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const node = this.getTempNode();

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		const method = nodeType?.methods?.loadOptions?.[methodName];

		if (typeof method !== 'function') {
			throw new Error(
				`The node-type "${node.type}" does not have the method "${methodName}" defined!`,
			);
		}

		const thisArgs = NodeExecuteFunctions.getLoadOptionsFunctions(
			this.workflow,
			node,
			this.path,
			additionalData,
		);

		return method.call(thisArgs);
	}

	/**
	 * Returns the available options via a load request information
	 */
	async getOptionsViaRequestProperty(
		loadOptions: ILoadOptions,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const node = this.getTempNode();

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node.type, node?.typeVersion);

		if (!nodeType?.description?.requestDefaults?.baseURL) {
			// This in in here for now for security reasons.
			// Background: As the full data for the request to make does get send, and the auth data
			// will then be applied, would it be possible to retrieve that data like that. By at least
			// requiring a baseURL to be defined can at least not a random server be called.
			// In the future this code has to get improved that it does not use the request information from
			// the request rather resolves it via the parameter-path and nodeType data.
			throw new Error(
				`The node-type "${node.type}" does not exist or does not have "requestDefaults.baseURL" defined!`,
			);
		}

		const mode = 'internal';
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };

		const routingNode = new RoutingNode(
			this.workflow,
			node,
			connectionInputData,
			runExecutionData ?? null,
			additionalData,
			mode,
		);

		// Create copy of node-type with the single property we want to get the data off
		const tempNode: INodeType = {
			...nodeType,
			...{
				description: {
					...nodeType.description,
					properties: [
						{
							displayName: '',
							type: 'string',
							name: '',
							default: '',
							routing: loadOptions.routing,
						} as INodeProperties,
					],
				},
			},
		};

		const inputData: ITaskDataConnections = {
			main: [[{ json: {} }]],
		};

		const optionsData = await routingNode.runNode(
			inputData,
			runIndex,
			tempNode,
			{ node, source: null, data: {} },
			NodeExecuteFunctions,
		);

		if (optionsData?.length === 0) {
			return [];
		}

		if (!Array.isArray(optionsData)) {
			throw new Error('The returned data is not an array!');
		}

		return optionsData[0].map((item) => item.json) as unknown as INodePropertyOptions[];
	}
}
