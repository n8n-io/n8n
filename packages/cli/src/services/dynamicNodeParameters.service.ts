import { Service } from 'typedi';
import type {
	ILoadOptions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	INodeListSearchResult,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	ResourceMapperFields,
	INodeCredentials,
	INodeParameters,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import { Workflow, RoutingNode } from 'n8n-workflow';
import { NodeExecuteFunctions } from 'n8n-core';
import { NodeTypes } from '@/NodeTypes';

@Service()
export class DynamicNodeParametersService {
	constructor(private nodeTypes: NodeTypes) {}

	/** Returns the available options via a predefined method */
	async getOptionsViaMethodName(
		methodName: string,
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	): Promise<INodePropertyOptions[]> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('loadOptions', methodName, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return method.call(thisArgs);
	}

	/** Returns the available options via a loadOptions param */
	async getOptionsViaLoadOptions(
		loadOptions: ILoadOptions,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	): Promise<INodePropertyOptions[]> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		if (!nodeType.description.requestDefaults?.baseURL) {
			// This in in here for now for security reasons.
			// Background: As the full data for the request to make does get send, and the auth data
			// will then be applied, would it be possible to retrieve that data like that. By at least
			// requiring a baseURL to be defined can at least not a random server be called.
			// In the future this code has to get improved that it does not use the request information from
			// the request rather resolves it via the parameter-path and nodeType data.
			throw new Error(
				`The node-type "${nodeType.description.name}" does not exist or does not have "requestDefaults.baseURL" defined!`,
			);
		}

		const mode = 'internal';
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const node = workflow.nodes[0];

		const routingNode = new RoutingNode(
			workflow,
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

	async getResourceLocatorResults(
		methodName: string,
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('listSearch', methodName, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return method.call(thisArgs, filter, paginationToken);
	}

	/** Returns the available mapping fields for the ResourceMapper component */
	async getResourceMappingFields(
		methodName: string,
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	): Promise<ResourceMapperFields> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('resourceMapping', methodName, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return method.call(thisArgs);
	}

	private getMethod(
		type: 'resourceMapping',
		methodName: string,
		nodeType: INodeType,
	): (this: ILoadOptionsFunctions) => Promise<ResourceMapperFields>;
	private getMethod(
		type: 'listSearch',
		methodName: string,
		nodeType: INodeType,
	): (
		this: ILoadOptionsFunctions,
		filter?: string | undefined,
		paginationToken?: string | undefined,
	) => Promise<INodeListSearchResult>;
	private getMethod(
		type: 'loadOptions',
		methodName: string,
		nodeType: INodeType,
	): (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;

	private getMethod(
		type: 'resourceMapping' | 'listSearch' | 'loadOptions',
		methodName: string,
		nodeType: INodeType,
	) {
		const method = nodeType.methods?.[type]?.[methodName];
		if (typeof method !== 'function') {
			throw new Error(
				`The node-type "${nodeType.description.name}" does not have the method "${methodName}" defined!`,
			);
		}
		return method;
	}

	private getNodeType({ name, version }: INodeTypeNameVersion) {
		return this.nodeTypes.getByNameAndVersion(name, version);
	}

	private getWorkflow(
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	) {
		const node: INode = {
			parameters: currentNodeParameters,
			id: 'uuid-1234',
			name: 'Temp-Node',
			type: nodeTypeAndVersion.name,
			typeVersion: nodeTypeAndVersion.version,
			position: [0, 0],
		};

		if (credentials) {
			node.credentials = credentials;
		}

		return new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});
	}

	private getThisArg(
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		workflow: Workflow,
	) {
		const node = Object.values(workflow.nodes)[0];
		return NodeExecuteFunctions.getLoadOptionsFunctions(workflow, node, path, additionalData);
	}
}
