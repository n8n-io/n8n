import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { transportSelect } from './descriptions';
import { getTools } from './loadOptions';
import type { McpServerTransport, McpAuthenticationOption, McpToolIncludeMode } from './types';
import {
	connectMcpClient,
	createCallTool,
	getAllTools,
	getAuthHeaders,
	getSelectedTools,
	McpToolkit,
	mcpToolToDynamicTool,
} from './utils';

/**
 * Get node parameters for MCP client configuration
 */
function getNodeConfig(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	itemIndex: number,
): {
	authentication: McpAuthenticationOption;
	timeout: number;
	serverTransport: McpServerTransport;
	endpointUrl: string;
	mode: McpToolIncludeMode;
	includeTools: string[];
	excludeTools: string[];
} {
	const node = ctx.getNode();
	const authentication = ctx.getNodeParameter(
		'authentication',
		itemIndex,
	) as McpAuthenticationOption;
	const timeout = ctx.getNodeParameter('options.timeout', itemIndex, 60000) as number;

	let serverTransport: McpServerTransport;
	let endpointUrl: string;
	if (node.typeVersion === 1) {
		serverTransport = 'sse';
		endpointUrl = ctx.getNodeParameter('sseEndpoint', itemIndex) as string;
	} else {
		serverTransport = ctx.getNodeParameter('serverTransport', itemIndex) as McpServerTransport;
		endpointUrl = ctx.getNodeParameter('endpointUrl', itemIndex) as string;
	}

	const mode = ctx.getNodeParameter('include', itemIndex) as McpToolIncludeMode;
	const includeTools = ctx.getNodeParameter('includeTools', itemIndex, []) as string[];
	const excludeTools = ctx.getNodeParameter('excludeTools', itemIndex, []) as string[];

	return {
		authentication,
		timeout,
		serverTransport,
		endpointUrl,
		mode,
		includeTools,
		excludeTools,
	};
}

/**
 * Connect to MCP server and get filtered tools
 */
async function connectAndGetTools(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	config: ReturnType<typeof getNodeConfig>,
) {
	const node = ctx.getNode();
	const { headers } = await getAuthHeaders(ctx, config.authentication);

	const client = await connectMcpClient({
		serverTransport: config.serverTransport,
		endpointUrl: config.endpointUrl,
		headers,
		name: node.type,
		version: node.typeVersion,
	});

	if (!client.ok) {
		return { client, mcpTools: null, error: client.error };
	}

	const allTools = await getAllTools(client.result);
	const mcpTools = getSelectedTools({
		tools: allTools,
		mode: config.mode,
		includeTools: config.includeTools,
		excludeTools: config.excludeTools,
	});

	return { client: client.result, mcpTools, error: null };
}

export class McpClientTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Client Tool',
		name: 'mcpClientTool',
		icon: {
			light: 'file:../mcp.svg',
			dark: 'file:../mcp.dark.svg',
		},
		group: ['output'],
		version: [1, 1.1, 1.2],
		description: 'Connect tools from an MCP Server',
		defaults: {
			name: 'MCP Client',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Model Context Protocol', 'Tools'],
			},
			alias: ['Model Context Protocol', 'MCP Client'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/',
					},
				],
			},
		},
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool, displayName: 'Tools' }],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'httpBearerAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['bearerAuth'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'SSE Endpoint',
				name: 'sseEndpoint',
				type: 'string',
				description: 'SSE Endpoint of your MCP server',
				placeholder: 'e.g. https://my-mcp-server.ai/sse',
				default: '',
				required: true,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Endpoint',
				name: 'endpointUrl',
				type: 'string',
				description: 'Endpoint of your MCP server',
				placeholder: 'e.g. https://my-mcp-server.ai/mcp',
				default: '',
				required: true,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			transportSelect({
				defaultOption: 'sse',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			}),
			transportSelect({
				defaultOption: 'httpStreamable',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			}),
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Bearer Auth',
						value: 'bearerAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate with your endpoint',
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: {
					show: {
						authentication: ['headerAuth', 'bearerAuth'],
					},
				},
			},
			{
				displayName: 'Tools to Include',
				name: 'include',
				type: 'options',
				description: 'How to select the tools you want to be exposed to the AI Agent',
				default: 'all',
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Also include all unchanged fields from the input',
					},
					{
						name: 'Selected',
						value: 'selected',
						description: 'Also include the tools listed in the parameter "Tools to Include"',
					},
					{
						name: 'All Except',
						value: 'except',
						description: 'Exclude the tools listed in the parameter "Tools to Exclude"',
					},
				],
			},
			{
				displayName: 'Tools to Include',
				name: 'includeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTools',
					loadOptionsDependsOn: ['sseEndpoint'],
				},
				displayOptions: {
					show: {
						include: ['selected'],
					},
				},
			},
			{
				displayName: 'Tools to Exclude',
				name: 'excludeTools',
				type: 'multiOptions',
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTools',
				},
				displayOptions: {
					show: {
						include: ['except'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 60000,
						description: 'Time in ms to wait for tool calls to finish',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getTools,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const config = getNodeConfig(this, itemIndex);

		const setError = (message: string, description?: string): SupplyData => {
			const error = new NodeOperationError(node, message, { itemIndex, description });
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		const { client, mcpTools, error } = await connectAndGetTools(this, config);

		if (error) {
			this.logger.error('McpClientTool: Failed to connect to MCP Server', { error });

			switch (error.type) {
				case 'invalid_url':
					return setError('Could not connect to your MCP server. The provided URL is invalid.');
				case 'connection':
				default:
					return setError('Could not connect to your MCP server');
			}
		}

		this.logger.debug('McpClientTool: Successfully connected to MCP Server');

		if (!mcpTools || !mcpTools.length) {
			return setError(
				'MCP Server returned no tools',
				'Connected successfully to your MCP server but it returned an empty list of tools.',
			);
		}

		const tools = mcpTools.map((tool) =>
			logWrapper(
				mcpToolToDynamicTool(
					tool,
					createCallTool(tool.name, client, config.timeout, (errorMessage) => {
						const error = new NodeOperationError(node, errorMessage, { itemIndex });
						void this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
						this.logger.error(`McpClientTool: Tool "${tool.name}" failed to execute`, { error });
					}),
				),
				this,
			),
		);

		this.logger.debug(`McpClientTool: Connected to MCP Server with ${tools.length} tools`);

		const toolkit = new McpToolkit(tools);

		return { response: toolkit, closeFunction: async () => await client.close() };
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const node = this.getNode();
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			const config = getNodeConfig(this, itemIndex);

			const { client, mcpTools, error } = await connectAndGetTools(this, config);

			if (error) {
				throw new NodeOperationError(node, error.error, { itemIndex });
			}

			if (!mcpTools?.length) {
				throw new NodeOperationError(node, 'MCP Server returned no tools', { itemIndex });
			}

			for (const tool of mcpTools) {
				// Check for tool name in item.json.tool (for toolkit execution from agent)
				// or item.tool (for direct execution)
				if (!item.json.tool || typeof item.json.tool !== 'string') {
					throw new NodeOperationError(node, 'Tool name not found in item.json.tool or item.tool', {
						itemIndex,
					});
				}

				const toolName = item.json.tool;
				if (toolName === tool.name) {
					// Extract the tool name from arguments before passing to MCP
					const { tool: _, ...toolArguments } = item.json;
					const params: {
						name: string;
						arguments: IDataObject;
					} = {
						name: tool.name,
						arguments: toolArguments,
					};
					const result = await client.callTool(params);
					returnData.push({
						json: {
							response: result.content as IDataObject,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				}
			}
		}

		return [returnData];
	}
}
