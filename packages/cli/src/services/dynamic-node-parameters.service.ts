import { Service } from '@n8n/di';
import { LoadOptionsContext, RoutingNode, LocalLoadOptionsContext, ExecuteContext } from 'n8n-core';
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
	NodeParameterValueType,
	IDataObject,
	ILocalLoadOptionsFunctions,
	IExecuteData,
} from 'n8n-workflow';
import { Workflow, UnexpectedError } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import { WorkflowLoaderService } from './workflow-loader.service';
import { User } from '@n8n/db';
import { userHasScopes } from '@/permissions.ee/check-access';
import { Logger } from '@n8n/backend-common';

type LocalResourceMappingMethod = (
	this: ILocalLoadOptionsFunctions,
) => Promise<ResourceMapperFields>;
type ListSearchMethod = (
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
) => Promise<INodeListSearchResult>;
type LoadOptionsMethod = (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;
type ActionHandlerMethod = (
	this: ILoadOptionsFunctions,
	payload?: string,
) => Promise<NodeParameterValueType>;
type ResourceMappingMethod = (this: ILoadOptionsFunctions) => Promise<ResourceMapperFields>;

type NodeMethod =
	| LocalResourceMappingMethod
	| ListSearchMethod
	| LoadOptionsMethod
	| ActionHandlerMethod
	| ResourceMappingMethod;

@Service()
export class DynamicNodeParametersService {
	constructor(
		private logger: Logger,
		private nodeTypes: NodeTypes,
		private workflowLoaderService: WorkflowLoaderService,
	) {}

	async scrubInaccessibleProjectId(user: User, payload: { projectId?: string }) {
		// We want to avoid relying on generic project:read permissions to enable
		// a future with fine-grained permission control dependent on the respective resource
		// For now we use the dataStore:listProject scope as this is the existing consumer of
		// the project id
		if (
			payload.projectId &&
			!(await userHasScopes(user, ['dataStore:listProject'], false, {
				projectId: payload.projectId,
			}))
		) {
			this.logger.warn(
				`Scrubbed inaccessible projectId ${payload.projectId} from DynamicNodeParameters request`,
			);
			payload.projectId = undefined;
		}
	}

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
		// Need to use untyped call since `this` usage is widespread and we don't have `strictBindCallApply`
		// enabled in `tsconfig.json`
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
			// This is in here for now for security reasons.
			// Background: As the full data for the request to make does get send, and the auth data
			// will then be applied, would it be possible to retrieve that data like that. By at least
			// requiring a baseURL to be defined can at least not a random server be called.
			// In the future this code has to get improved that it does not use the request information from
			// the request rather resolves it via the parameter-path and nodeType data.
			throw new UnexpectedError(
				'Node type does not exist or does not have "requestDefaults.baseURL" defined!',
				{ tags: { nodeType: nodeType.description.name } },
			);
		}

		const mode = 'internal';
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData: IRunExecutionData = { resultData: { runData: {} } };
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const node = workflow.nodes['Temp-Node'];

		// Create copy of node-type with the single property we want to get the data off
		const tempNodeType: INodeType = {
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

		const executeData: IExecuteData = {
			node,
			source: null,
			data: {},
		};
		const executeFunctions = new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
			[],
		);
		const routingNode = new RoutingNode(executeFunctions, tempNodeType);
		const optionsData = await routingNode.runNode();

		if (optionsData?.length === 0) {
			return [];
		}

		if (!Array.isArray(optionsData)) {
			throw new UnexpectedError('The returned data is not an array');
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

	/** Returns the available workflow input mapping fields for the ResourceMapper component */
	async getLocalResourceMappingFields(
		methodName: string,
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
	): Promise<ResourceMapperFields> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('localResourceMapping', methodName, nodeType);
		const thisArgs = this.getLocalLoadOptionsContext(path, additionalData);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return method.call(thisArgs);
	}

	/** Returns the result of the action handler */
	async getActionResult(
		handler: string,
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		payload: IDataObject | string | undefined,
		credentials?: INodeCredentials,
	): Promise<NodeParameterValueType> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const method = this.getMethod('actionHandler', handler, nodeType);
		const workflow = this.getWorkflow(nodeTypeAndVersion, currentNodeParameters, credentials);
		const thisArgs = this.getThisArg(path, additionalData, workflow);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return method.call(thisArgs, payload);
	}

	private getMethod(
		type: 'resourceMapping',
		methodName: string,
		nodeType: INodeType,
	): ResourceMappingMethod;
	private getMethod(
		type: 'localResourceMapping',
		methodName: string,
		nodeType: INodeType,
	): LocalResourceMappingMethod;
	private getMethod(type: 'listSearch', methodName: string, nodeType: INodeType): ListSearchMethod;
	private getMethod(
		type: 'loadOptions',
		methodName: string,
		nodeType: INodeType,
	): LoadOptionsMethod;
	private getMethod(
		type: 'actionHandler',
		methodName: string,
		nodeType: INodeType,
	): ActionHandlerMethod;
	private getMethod(
		type:
			| 'resourceMapping'
			| 'localResourceMapping'
			| 'listSearch'
			| 'loadOptions'
			| 'actionHandler',
		methodName: string,
		nodeType: INodeType,
	): NodeMethod {
		const method = nodeType.methods?.[type]?.[methodName] as NodeMethod;
		if (typeof method !== 'function') {
			throw new UnexpectedError('Node type does not have method defined', {
				tags: { nodeType: nodeType.description.name },
				extra: { methodName },
			});
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
		const node = workflow.nodes['Temp-Node'];
		return new LoadOptionsContext(workflow, node, additionalData, path);
	}

	private getLocalLoadOptionsContext(
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
	): ILocalLoadOptionsFunctions {
		return new LocalLoadOptionsContext(
			this.nodeTypes,
			additionalData,
			path,
			this.workflowLoaderService,
		);
	}
}
