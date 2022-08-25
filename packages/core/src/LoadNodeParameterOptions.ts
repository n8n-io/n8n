/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
	ILoadOptions,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeNameVersion,
	INodeTypes,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	RoutingNode,
	Workflow,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import { NodeExecuteFunctions } from '.';

const TEMP_NODE_NAME = 'Temp-Node';
const TEMP_WORKFLOW_NAME = 'Temp-Workflow';

export class LoadNodeParameterOptions {
	currentNodeParameters: INodeParameters;

	path: string;

	workflow: Workflow;

	constructor(
		nodeTypeNameAndVersion: INodeTypeNameVersion,
		nodeTypes: INodeTypes,
		path: string,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	) {
		const nodeType = nodeTypes.getByNameAndVersion(
			nodeTypeNameAndVersion.name,
			nodeTypeNameAndVersion.version,
		);
		this.currentNodeParameters = currentNodeParameters;
		this.path = path;
		if (nodeType === undefined) {
			throw new Error(
				`The node-type "${nodeTypeNameAndVersion.name} v${nodeTypeNameAndVersion.version}"  is not known!`,
			);
		}

		const nodeData: INode = {
			parameters: currentNodeParameters,
			id: 'uuid-1234',
			name: TEMP_NODE_NAME,
			type: nodeTypeNameAndVersion.name,
			typeVersion: nodeTypeNameAndVersion.version,
			position: [0, 0],
		};
		if (credentials) {
			nodeData.credentials = credentials;
		}

		const workflowData = {
			nodes: [nodeData],
			connections: {},
		};

		this.workflow = new Workflow({
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: false,
			nodeTypes,
		});
	}

	/**
	 * Returns data of a fake workflow
	 *
	 * @returns
	 * @memberof LoadNodeParameterOptions
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	getWorkflowData() {
		return {
			name: TEMP_WORKFLOW_NAME,
			active: false,
			connections: {},
			nodes: Object.values(this.workflow.nodes),
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	/**
	 * Returns the available options via a predefined method
	 *
	 * @param {string} methodName The name of the method of which to get the data from
	 * @param {IWorkflowExecuteAdditionalData} additionalData
	 * @returns {Promise<INodePropertyOptions[]>}
	 * @memberof LoadNodeParameterOptions
	 */
	async getOptionsViaMethodName(
		methodName: string,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const node = this.workflow.getNode(TEMP_NODE_NAME);

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node!.type, node?.typeVersion);

		if (
			!nodeType ||
			nodeType.methods === undefined ||
			nodeType.methods.loadOptions === undefined ||
			nodeType.methods.loadOptions[methodName] === undefined
		) {
			throw new Error(
				`The node-type "${node!.type}" does not have the method "${methodName}" defined!`,
			);
		}

		const thisArgs = NodeExecuteFunctions.getLoadOptionsFunctions(
			this.workflow,
			node!,
			this.path,
			additionalData,
		);

		return nodeType.methods.loadOptions[methodName].call(thisArgs);
	}

	/**
	 * Returns the available options via a load request informatoin
	 *
	 * @param {ILoadOptions} loadOptions The load options which also contain the request information
	 * @param {IWorkflowExecuteAdditionalData} additionalData
	 * @returns {Promise<INodePropertyOptions[]>}
	 * @memberof LoadNodeParameterOptions
	 */
	async getOptionsViaRequestProperty(
		loadOptions: ILoadOptions,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<INodePropertyOptions[]> {
		const node = this.workflow.getNode(TEMP_NODE_NAME);

		const nodeType = this.workflow.nodeTypes.getByNameAndVersion(node!.type, node?.typeVersion);

		if (
			nodeType === undefined ||
			!nodeType.description.requestDefaults ||
			!nodeType.description.requestDefaults.baseURL
		) {
			// This in in here for now for security reasons.
			// Background: As the full data for the request to make does get send, and the auth data
			// will then be applied, would it be possible to retrieve that data like that. By at least
			// requiring a baseURL to be defined can at least not a random server be called.
			// In the future this code has to get improved that it does not use the request information from
			// the request rather resolves it via the parameter-path and nodeType data.
			throw new Error(
				`The node-type "${
					node!.type
				}" does not exist or does not have "requestDefaults.baseURL" defined!`,
			);
		}

		const mode = 'internal';
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };

		const routingNode = new RoutingNode(
			this.workflow,
			node!,
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
			{ node: node!, source: null, data: {} },
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
