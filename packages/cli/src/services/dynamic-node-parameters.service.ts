import { Logger } from '@n8n/backend-common';
import { SharedWorkflowRepository, User } from '@n8n/db';
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
import {
	Workflow,
	UnexpectedError,
	createEmptyRunExecutionData,
	findDisplayedProperty,
} from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import { withExpressionIsolate } from '@/utils';

import { WorkflowLoaderService } from './workflow-loader.service';

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
	payload?: string | IDataObject,
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
		private sharedWorkflowRepository: SharedWorkflowRepository,
		private credentialsFinderService: CredentialsFinderService,
	) {}

	async refineResourceIds(
		user: User,
		payload: { projectId?: string; workflowId?: string; credentials?: INodeCredentials },
	) {
		// We want to avoid relying on generic project:read permissions to enable
		// a future with fine-grained permission control dependent on the respective resource
		// For now we use the dataTable:listProject scope as this is the existing consumer of
		// the project id
		if (
			payload.projectId &&
			!(await userHasScopes(user, ['dataTable:listProject'], false, {
				projectId: payload.projectId,
			}))
		) {
			this.logger.warn(
				`Scrubbed inaccessible projectId ${payload.projectId} from DynamicNodeParameters request`,
			);
			payload.projectId = undefined;
		}

		if (payload.workflowId) {
			const hasAccess = await userHasScopes(user, ['workflow:read'], false, {
				workflowId: payload.workflowId,
			});

			if (!hasAccess) {
				this.logger.warn(
					`Scrubbed inaccessible workflowId ${payload.workflowId} from DynamicNodeParameters request`,
				);
				payload.workflowId = undefined;
			} else if (payload.projectId === undefined) {
				const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(
					payload.workflowId,
				);
				payload.projectId = project?.id;
			}
		}

		if (payload.credentials) {
			const credentialIds = Object.values(payload.credentials)
				.map((details) => details.id)
				.filter((id): id is string => id !== undefined && id !== null);

			if (credentialIds.length > 0) {
				const accessibleIds = await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
					credentialIds,
					user,
					['credential:read'],
				);

				const forbiddenId = credentialIds.find((id) => !accessibleIds.has(id));
				if (forbiddenId !== undefined) {
					throw new ForbiddenError();
				}
			}
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
		return await withExpressionIsolate(workflow, async () => {
			// Need to use untyped call since `this` usage is widespread and we don't have `strictBindCallApply`
			// enabled in `tsconfig.json`
			return await method.call(thisArgs);
		});
	}

	/**
	 * Resolves the property's loadOptions routing from the node definition via the parameter path
	 * (not from the request body), then runs it.
	 */
	async getOptionsViaLoadOptionsByPath(
		path: string,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeTypeAndVersion: INodeTypeNameVersion,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	): Promise<INodePropertyOptions[]> {
		const nodeType = this.getNodeType(nodeTypeAndVersion);
		const property = findDisplayedProperty(
			path,
			nodeType.description.properties,
			currentNodeParameters,
			{ typeVersion: nodeTypeAndVersion.version },
			nodeType.description,
		);
		const routing =
			property && 'typeOptions' in property
				? property.typeOptions?.loadOptions?.routing
				: undefined;
		if (!routing) {
			throw new BadRequestError(
				`Node type "${nodeType.description.name}" has no loadOptions routing for parameter path "${path}"`,
			);
		}
		return await this.getOptionsViaLoadOptions(
			{ routing },
			additionalData,
			nodeTypeAndVersion,
			currentNodeParameters,
			credentials,
		);
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
			throw new BadRequestError(
				`Node type "${nodeType.description.name}" does not exist or does not have "requestDefaults.baseURL" defined!`,
			);
		}

		const mode = 'internal';
		const runIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runExecutionData = createEmptyRunExecutionData();
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
		return await withExpressionIsolate(workflow, async () => {
			const optionsData = await routingNode.runNode();

			if (optionsData?.length === 0) {
				return [];
			}

			if (!Array.isArray(optionsData)) {
				throw new UnexpectedError('The returned data is not an array');
			}

			return optionsData[0].map((item) => item.json) as unknown as INodePropertyOptions[];
		});
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
		return await withExpressionIsolate(workflow, async () => {
			return await method.call(thisArgs, filter, paginationToken);
		});
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
		return await withExpressionIsolate(workflow, async () =>
			this.removeDuplicateResourceMappingFields(await method.call(thisArgs)),
		);
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
		return this.removeDuplicateResourceMappingFields(await method.call(thisArgs));
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
		return await withExpressionIsolate(workflow, async () => {
			return await method.call(thisArgs, payload);
		});
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
		const methodsOfType = nodeType.methods?.[type];
		const method = methodsOfType?.[methodName] as NodeMethod;
		if (typeof method !== 'function') {
			const available = methodsOfType ? Object.keys(methodsOfType) : [];

			// Cross-reference: if the requested type has nothing (or lacks this
			// method), surface other method-type registrations so callers can
			// self-correct when they picked the wrong methodType. E.g. asking
			// for `loadOptions.listModels` on a node that only has
			// `listSearch.searchModels` now returns both pieces of information.
			const otherTypesWithMethods: string[] = [];
			for (const [otherType, otherMethods] of Object.entries(nodeType.methods ?? {})) {
				if (otherType === type || !otherMethods) continue;
				const names = Object.keys(otherMethods);
				if (names.length > 0) {
					otherTypesWithMethods.push(`${otherType}: ${names.join(', ')}`);
				}
			}

			const availableText =
				available.length > 0 ? available.join(', ') : `<no ${type} methods declared>`;
			const otherTypesText =
				otherTypesWithMethods.length > 0
					? ` Other method types on this node — ${otherTypesWithMethods.join('; ')}.`
					: '';

			throw new BadRequestError(
				`Node type "${nodeType.description.name}" has no ${type} method named "${methodName}". Available ${type} methods: ${availableText}.${otherTypesText}`,
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

	private removeDuplicateResourceMappingFields(fields: ResourceMapperFields) {
		const uniqueFieldIds = new Set<string>();
		return {
			...fields,
			fields: fields.fields?.filter((field) => {
				if (uniqueFieldIds.has(field.id)) {
					return false;
				}

				uniqueFieldIds.add(field.id);
				return true;
			}),
		};
	}
}
