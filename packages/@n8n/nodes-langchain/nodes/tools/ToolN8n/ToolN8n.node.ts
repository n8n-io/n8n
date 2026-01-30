import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	IHttpRequestMethods,
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeOperationError,
	tryToParseAlphanumericString,
} from 'n8n-workflow';

import { N8nTool } from '@utils/N8nTool';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import { logWrapper } from '@utils/logWrapper';
import { z } from 'zod';

type DataItemsResponse<T> = {
	data: T[];
};

interface PartialWorkflow {
	id: string;
	name: string;
}

async function searchWorkflows(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('n8nApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
	const apiKey = credentials.apiKey as string;

	const response = await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/workflows`,
		headers: {
			'X-N8N-API-KEY': apiKey,
			'Content-Type': 'application/json',
		},
		json: true,
	});

	const searchResults = (response as DataItemsResponse<PartialWorkflow>).data || response;

	const workflows = (searchResults as PartialWorkflow[])
		.map((w: PartialWorkflow) => ({
			name: `${w.name} (#${w.id})`,
			value: w.id,
		}))
		.filter(
			(w) =>
				!query ||
				w.name.toLowerCase().includes(query.toLowerCase()) ||
				w.value?.toString() === query,
		)
		.sort((a, b) => {
			const aNum = parseInt(a.value as string, 10);
			const bNum = parseInt(b.value as string, 10);
			return bNum - aNum;
		});

	return {
		results: workflows,
	};
}

async function getTool(ctx: ISupplyDataFunctions | IExecuteFunctions, itemIndex: number) {
	const credentials = await ctx.getCredentials('n8nApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
	const apiKey = credentials.apiKey as string;

	const resource = ctx.getNodeParameter('resource', itemIndex) as string;
	const operation = ctx.getNodeParameter('operation', itemIndex) as string;

	// Pre-read workflow object and credential data at tool creation time
	let workflowObjectParam: any = undefined;
	let credentialDataParam: any = undefined;

	try {
		if (resource === 'workflow' && (operation === 'create' || operation === 'update')) {
			const rawParam = ctx.getNodeParameter('workflowObject', itemIndex, undefined);
			if (rawParam !== undefined) {
				workflowObjectParam = typeof rawParam === 'string' ? JSON.parse(rawParam) : rawParam;
			}
		}
		if (resource === 'credential' && operation === 'create') {
			const rawParam = ctx.getNodeParameter('credentialData', itemIndex, undefined);
			if (rawParam !== undefined) {
				credentialDataParam = typeof rawParam === 'string' ? JSON.parse(rawParam) : rawParam;
			}
		}
	} catch (parseError: any) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Failed to parse JSON parameter: ${parseError.message}`,
			{ itemIndex },
		);
	}

	const name = ctx.getNode().name.replace(/ /g, '_');
	try {
		tryToParseAlphanumericString(name);
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			'The name of this tool is not a valid alphanumeric string',
			{
				itemIndex,
				description:
					"Only alphanumeric characters and underscores are allowed in the tool's name, and the name cannot start with a number",
			},
		);
	}

	let description = '';
	let schema: z.ZodObject<any>;

	// Build description and schema based on resource and operation
	if (resource === 'workflow') {
		if (operation === 'get') {
			description = 'Get a workflow by its ID from n8n';
			schema = z.object({
				workflowId: z.string().describe('The ID of the workflow to retrieve'),
			});
		} else if (operation === 'getAll') {
			description = 'Get multiple workflows from n8n, optionally filtered';
			schema = z.object({
				limit: z
					.number()
					.optional()
					.describe('Maximum number of workflows to return (default: 50)'),
				active: z.boolean().optional().describe('Filter by active workflows only'),
				name: z.string().optional().describe('Filter workflows by name'),
				tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
			});
		} else if (operation === 'create') {
			description =
				'Create a new workflow in n8n. IMPORTANT: The workflow object MUST be pre-configured in the node parameters field, NOT passed as a parameter. Only call this tool after the workflow JSON has been set in the UI.';
			schema = z.object({});
		} else if (operation === 'update') {
			description =
				'Update an existing workflow in n8n. IMPORTANT: The workflow object MUST be pre-configured in the node parameters field, NOT passed as a parameter. Only call this tool after the workflow JSON has been set in the UI.';
			schema = z.object({
				workflowId: z.string().describe('The ID of the workflow to update'),
			});
		} else if (operation === 'delete') {
			description = 'Delete a workflow by its ID from n8n';
			schema = z.object({
				workflowId: z.string().describe('The ID of the workflow to delete'),
			});
		} else if (operation === 'activate') {
			description = 'Activate a workflow by its ID in n8n';
			schema = z.object({
				workflowId: z.string().describe('The ID of the workflow to activate'),
			});
		} else if (operation === 'deactivate') {
			description = 'Deactivate a workflow by its ID in n8n';
			schema = z.object({
				workflowId: z.string().describe('The ID of the workflow to deactivate'),
			});
		}
	} else if (resource === 'execution') {
		if (operation === 'get') {
			description = 'Get an execution by its ID from n8n';
			schema = z.object({
				executionId: z.string().describe('The ID of the execution to retrieve'),
			});
		} else if (operation === 'getAll') {
			description = 'Get multiple executions from n8n, optionally filtered';
			schema = z.object({
				limit: z
					.number()
					.optional()
					.describe('Maximum number of executions to return (default: 50)'),
				workflowId: z.string().optional().describe('Filter executions by workflow ID'),
				status: z
					.string()
					.optional()
					.describe('Filter executions by status (error, success, waiting)'),
			});
		} else if (operation === 'delete') {
			description = 'Delete an execution by its ID from n8n';
			schema = z.object({
				executionId: z.string().describe('The ID of the execution to delete'),
			});
		}
	} else if (resource === 'credential') {
		if (operation === 'create') {
			description =
				'Create a new credential in n8n. IMPORTANT: The credential data MUST be pre-configured in the node parameters field, NOT passed as a parameter.';
			schema = z.object({
				credentialName: z.string().describe('Name for the new credential'),
				credentialType: z.string().describe('The credential type name (e.g., n8nApi, githubApi)'),
			});
		} else if (operation === 'delete') {
			description = 'Delete a credential by its ID from n8n';
			schema = z.object({
				credentialId: z.string().describe('The ID of the credential to delete'),
			});
		} else if (operation === 'getSchema') {
			description = 'Get the data schema for a credential type in n8n';
			schema = z.object({
				credentialTypeName: z
					.string()
					.describe('The credential type name (e.g., n8nApi, githubApi)'),
			});
		}
	} else if (resource === 'audit') {
		if (operation === 'generate') {
			description = 'Generate a security audit for the n8n instance';
			schema = z.object({});
		}
	}

	const func = async (input: IDataObject): Promise<string> => {
		try {
			let url = '';
			let method: IHttpRequestMethods = 'GET';
			const qs: IDataObject = {};

			// Merge AI input with node parameters (AI input takes precedence)
			const getParam = (paramName: string, fromInput?: any) => {
				if (fromInput !== undefined) return fromInput;
				try {
					return ctx.getNodeParameter(paramName, itemIndex);
				} catch {
					return undefined;
				}
			};

			let body: IDataObject = {};

			if (resource === 'workflow') {
				if (operation === 'get') {
					const workflowId = input.workflowId || getParam('workflowId');
					url = `${baseUrl}/workflows/${workflowId}`;
				} else if (operation === 'getAll') {
					url = `${baseUrl}/workflows`;
					const options = (getParam('options', input.options) as IDataObject) || {};
					const filters = (getParam('filters', input.filters) as IDataObject) || {};

					if (input.limit || options.limit) qs.limit = input.limit || options.limit;
					if (input.active !== undefined || filters.active !== undefined) {
						qs.active = input.active !== undefined ? input.active : filters.active;
					}
					if (input.name || filters.name) qs.name = input.name || filters.name;
					if (input.tags || filters.tags) qs.tags = input.tags || filters.tags;
				} else if (operation === 'create') {
					url = `${baseUrl}/workflows`;
					method = 'POST';

					// Use pre-read parameter
					if (!workflowObjectParam) {
						throw new NodeOperationError(
							ctx.getNode(),
							'Workflow object is required for create operation. Please configure it in the "Workflow Object" field.',
							{ itemIndex },
						);
					}

					body = {
						name: workflowObjectParam.name || 'My workflow',
						nodes: workflowObjectParam.nodes || [],
						connections: workflowObjectParam.connections || {},
						settings: workflowObjectParam.settings || {},
						staticData: workflowObjectParam.staticData || null,
					};
				} else if (operation === 'update') {
					const workflowId = input.workflowId || getParam('workflowId');
					url = `${baseUrl}/workflows/${workflowId}`;
					method = 'PUT';

					// Use pre-read parameter
					if (!workflowObjectParam) {
						throw new NodeOperationError(
							ctx.getNode(),
							'Workflow object is required for update operation. Please configure it in the "Workflow Object" field.',
							{ itemIndex },
						);
					}

					body = {};
					if (workflowObjectParam.name) body.name = workflowObjectParam.name;
					if (workflowObjectParam.nodes) body.nodes = workflowObjectParam.nodes;
					if (workflowObjectParam.connections) body.connections = workflowObjectParam.connections;
					if (workflowObjectParam.settings) body.settings = workflowObjectParam.settings;
					if (workflowObjectParam.staticData) body.staticData = workflowObjectParam.staticData;
				} else if (operation === 'delete') {
					const workflowId = input.workflowId || getParam('workflowId');
					url = `${baseUrl}/workflows/${workflowId}`;
					method = 'DELETE';
				} else if (operation === 'activate') {
					const workflowId = input.workflowId || getParam('workflowId');
					url = `${baseUrl}/workflows/${workflowId}/activate`;
					method = 'POST';
				} else if (operation === 'deactivate') {
					const workflowId = input.workflowId || getParam('workflowId');
					url = `${baseUrl}/workflows/${workflowId}/deactivate`;
					method = 'POST';
				}
			} else if (resource === 'execution') {
				if (operation === 'get') {
					const executionId = input.executionId || getParam('executionId');
					url = `${baseUrl}/executions/${executionId}`;
				} else if (operation === 'getAll') {
					url = `${baseUrl}/executions`;
					const options = (getParam('options', input.options) as IDataObject) || {};
					const filters = (getParam('filters', input.filters) as IDataObject) || {};

					if (input.limit || options.limit) qs.limit = input.limit || options.limit;
					if (input.workflowId || filters.workflowId) {
						qs.workflowId = input.workflowId || filters.workflowId;
					}
					if (input.status || filters.status) qs.status = input.status || filters.status;
				} else if (operation === 'delete') {
					const executionId = input.executionId || getParam('executionId');
					url = `${baseUrl}/executions/${executionId}`;
					method = 'DELETE';
				}
			} else if (resource === 'credential') {
				if (operation === 'create') {
					url = `${baseUrl}/credentials`;
					method = 'POST';

					// Use pre-read parameter
					if (!credentialDataParam) {
						throw new NodeOperationError(
							ctx.getNode(),
							'Credential data is required for create operation. Please configure it in the "Data" field.',
							{ itemIndex },
						);
					}

					body = {
						name: input.credentialName || getParam('credentialName'),
						type: input.credentialType || getParam('credentialType'),
						data: credentialDataParam,
					};
				} else if (operation === 'delete') {
					const credentialId = input.credentialId || getParam('credentialId');
					url = `${baseUrl}/credentials/${credentialId}`;
					method = 'DELETE';
				} else if (operation === 'getSchema') {
					const credentialTypeName = input.credentialTypeName || getParam('credentialTypeName');
					url = `${baseUrl}/credentials/schema/${credentialTypeName}`;
				}
			} else if (resource === 'audit') {
				if (operation === 'generate') {
					url = `${baseUrl}/audit`;
					method = 'POST';
				}
			}

			const requestOptions: any = {
				method,
				url,
				qs,
				headers: {
					'X-N8N-API-KEY': apiKey,
					'Content-Type': 'application/json',
				},
				json: true,
			};

			if (Object.keys(body).length > 0) {
				requestOptions.body = body;
			}

			const response = await ctx.helpers.httpRequest(requestOptions);

			return JSON.stringify(response, null, 2);
		} catch (error) {
			throw new NodeOperationError(ctx.getNode(), `n8n API request failed: ${error.message}`, {
				itemIndex,
			});
		}
	};

	return new N8nTool(ctx as ISupplyDataFunctions, {
		name,
		description: description!,
		func,
		schema: schema!,
	});
}

export class ToolN8n implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Tool',
		name: 'toolN8n',
		icon: 'file:n8n.svg',
		group: ['transform'],
		version: 1,
		description: 'Interact with n8n API to manage workflows, executions, credentials and audits',
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		defaults: {
			name: 'n8n',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.tooln8n/',
					},
				],
			},
		},
		credentials: [
			{
				name: 'n8nApi',
				required: true,
			},
		],
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Audit',
						value: 'audit',
					},
					{
						name: 'Credential',
						value: 'credential',
					},
					{
						name: 'Execution',
						value: 'execution',
					},
					{
						name: 'Workflow',
						value: 'workflow',
					},
				],
				default: 'workflow',
			},
			// Workflow operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['workflow'],
					},
				},
				options: [
					{
						name: 'Activate',
						value: 'activate',
						action: 'Activate a workflow',
						description: 'Activate a workflow by ID',
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create a workflow',
						description: 'Create a new workflow',
					},
					{
						name: 'Deactivate',
						value: 'deactivate',
						action: 'Deactivate a workflow',
						description: 'Deactivate a workflow by ID',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a workflow',
						description: 'Delete a workflow by ID',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a workflow',
						description: 'Get a workflow by ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many workflows',
						description: 'Get multiple workflows',
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update a workflow',
						description: 'Update an existing workflow',
					},
				],
				default: 'get',
			},
			// Execution operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['execution'],
					},
				},
				options: [
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete an execution',
						description: 'Delete an execution by ID',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get an execution',
						description: 'Get an execution by ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many executions',
						description: 'Get multiple executions',
					},
				],
				default: 'get',
			},
			// Credential operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['credential'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a credential',
						description: 'Create a new credential',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a credential',
						description: 'Delete a credential by ID',
					},
					{
						name: 'Get Schema',
						value: 'getSchema',
						action: 'Get credential schema',
						description: 'Get credential data schema for a type',
					},
				],
				default: 'getSchema',
			},
			// Audit operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['audit'],
					},
				},
				options: [
					{
						name: 'Generate',
						value: 'generate',
						action: 'Generate a security audit',
						description: 'Generate a security audit for this n8n instance',
					},
				],
				default: 'generate',
			},
			// Workflow ID field with resourceLocator
			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['get', 'activate', 'deactivate', 'delete', 'update'],
					},
				},
				description: 'The workflow to operate on',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Workflow...',
						initType: 'workflow',
						typeOptions: {
							searchListMethod: 'searchWorkflows',
							searchFilterRequired: false,
							searchable: true,
						},
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://myinstance.app.n8n.cloud/workflow/abc123',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.*/workflow/([0-9a-zA-Z]{1,})',
									errorMessage: 'Not a valid Workflow URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9a-zA-Z]{1,}',
									errorMessage: 'Not a valid Workflow ID',
								},
							},
						],
						placeholder: 'abc123',
					},
				],
			},
			// Workflow Object field for create/update
			{
				displayName: 'Workflow Object',
				name: 'workflowObject',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['create', 'update'],
					},
				},
				default:
					'{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
				placeholder:
					'{\n  "name": "My workflow",\n  "nodes": [],\n  "connections": {},\n  "settings": {}\n}',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 10,
				},
				description:
					'A valid JSON object with required fields: name, nodes, connections, and settings',
			},
			// Execution ID field
			{
				displayName: 'Execution ID',
				name: 'executionId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['execution'],
						operation: ['get', 'delete'],
					},
				},
				default: '',
				description: 'The ID of the execution',
				placeholder: 'e.g. 12345',
			},
			// Credential ID field
			{
				displayName: 'Credential ID',
				name: 'credentialId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['credential'],
						operation: ['delete'],
					},
				},
				default: '',
				description: 'The ID of the credential to delete',
				placeholder: 'e.g. 123',
			},
			// Credential Name field
			{
				displayName: 'Name',
				name: 'credentialName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['credential'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Name of the new credential',
				placeholder: 'e.g. My n8n Account',
			},
			// Credential Type field (for create)
			{
				displayName: 'Credential Type',
				name: 'credentialType',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['credential'],
						operation: ['create'],
					},
				},
				default: '',
				placeholder: 'e.g. n8nApi',
				description: 'The credential type name',
			},
			// Credential Data field
			{
				displayName: 'Data',
				name: 'credentialData',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['credential'],
						operation: ['create'],
					},
				},
				default:
					'{\n  "apiKey": "your-api-key",\n  "baseUrl": "https://your-instance.app.n8n.cloud/api/v1"\n}',
				placeholder:
					'{\n  "apiKey": "your-api-key",\n  "baseUrl": "https://your-instance.app.n8n.cloud/api/v1"\n}',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 10,
				},
				description: 'A valid JSON object with properties required for this credential type',
			},
			// Credential Type field (for getSchema)
			{
				displayName: 'Credential Type',
				name: 'credentialTypeName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['credential'],
						operation: ['getSchema'],
					},
				},
				default: '',
				placeholder: 'e.g. n8nApi',
				description: 'The credential type name',
			},
			// Options for getAll operations
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 250,
						},
						default: 50,
						description: 'Max number of results to return',
					},
				],
			},
			// Filters for workflows
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['workflow'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Active',
						name: 'active',
						type: 'boolean',
						default: true,
						description: 'Whether to return only active workflows',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Filter workflows by name',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of tags to filter by',
					},
				],
			},
			// Filters for executions
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['execution'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Workflow',
						name: 'workflowId',
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						description: 'The workflow to filter executions by',
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select a Workflow...',
								initType: 'workflow',
								typeOptions: {
									searchListMethod: 'searchWorkflows',
									searchFilterRequired: false,
									searchable: true,
								},
							},
							{
								displayName: 'By URL',
								name: 'url',
								type: 'string',
								placeholder: 'https://myinstance.app.n8n.cloud/workflow/abc123',
								validation: [
									{
										type: 'regex',
										properties: {
											regex: '.*/workflow/([0-9a-zA-Z]{1,})',
											errorMessage: 'Not a valid Workflow URL',
										},
									},
								],
								extractValue: {
									type: 'regex',
									regex: '.*/workflow/([0-9a-zA-Z]{1,})',
								},
							},
							{
								displayName: 'ID',
								name: 'id',
								type: 'string',
								validation: [
									{
										type: 'regex',
										properties: {
											regex: '[0-9a-zA-Z]{1,}',
											errorMessage: 'Not a valid Workflow ID',
										},
									},
								],
								placeholder: 'abc123',
							},
						],
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Error',
								value: 'error',
							},
							{
								name: 'Success',
								value: 'success',
							},
							{
								name: 'Waiting',
								value: 'waiting',
							},
						],
						default: 'success',
						description: 'Filter executions by status',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			searchWorkflows,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const tool = await getTool(this, itemIndex);
		return {
			response: logWrapper(tool, this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const result: INodeExecutionData[] = [];
		const input = this.getInputData();

		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const tool = await getTool(this, i);

			result.push({
				json: {
					response: await tool.invoke(item.json),
				},
				pairedItem: {
					item: i,
				},
			});
		}

		return [result];
	}
}
