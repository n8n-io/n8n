import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { Container } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import pick from 'lodash/pick';
import { StructuredToolkit } from 'n8n-core';
import {
	type IDataObject,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

import { getTools } from './loadOptions';
import type { McpToolIncludeMode } from './types';
import { createCallTool, getSelectedTools, mcpToolToDynamicTool } from './utils';
import { credentials, transportSelect } from '../shared/descriptions';
import { McpClientsManager, type McpCacheLogger } from '../shared/McpClientsManager';
import type { McpAuthenticationOption, McpServerTransport, McpTool } from '../shared/types';
import {
	connectMcpClient,
	getAllTools,
	getAuthHeaders,
	mapToNodeOperationError,
	tryRefreshOAuth2Token,
} from '../shared/utils';

function getCacheKey(executionId: string, nodeName: string): string {
	return `${executionId}:${nodeName}`;
}

/**
 * Narrow to a real Logger only when both methods are callable —
 * jest-mock-extended's `mock<any>` returns proxy values that are truthy
 * but not callable, which would crash a naive `logger?.debug(...)`.
 */
function narrowLogger(ctx: IExecuteFunctions): McpCacheLogger | undefined {
	const logger = ctx.logger;
	return typeof logger?.debug === 'function' && typeof logger?.warn === 'function'
		? logger
		: undefined;
}

/** Connect to MCP server and return client + tools, or throw on failure. */
async function connectOrThrow(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
): Promise<{ client: Client; mcpTools: McpTool[] }> {
	const node = ctx.getNode();
	const config = getNodeConfig(ctx, itemIndex);
	const result = await connectAndGetTools(ctx, config);

	if (result.error) {
		throw new NodeOperationError(node, result.error.error, { itemIndex });
	}

	if (!result.mcpTools?.length) {
		throw new NodeOperationError(node, 'MCP Server returned no tools', { itemIndex });
	}

	return { client: result.client, mcpTools: result.mcpTools };
}

interface AppendToolResultsOpts {
	node: INode;
	item: INodeExecutionData;
	mcpTools: McpTool[];
	client: Client;
	timeout: number;
	itemIndex: number;
	returnData: INodeExecutionData[];
}

/** Run matching tool from item.json.tool against the MCP client and push result. */
async function appendToolResults(opts: AppendToolResultsOpts): Promise<void> {
	const { node, item, mcpTools, client, timeout, itemIndex, returnData } = opts;

	const toolName = item.json.tool;
	if (typeof toolName !== 'string' || toolName.length === 0) {
		throw new NodeOperationError(node, 'Tool name not found in item.json.tool or item.tool', {
			itemIndex,
		});
	}

	const tool = mcpTools.find((t) => t.name === toolName);
	if (!tool) return;

	const { tool: _, ...toolArguments } = item.json;
	const schema: JSONSchema7 = tool.inputSchema;
	const sanitizedToolArguments: IDataObject =
		schema.additionalProperties !== true
			? pick(toolArguments, Object.keys(schema.properties ?? {}))
			: toolArguments;

	const result = await client.callTool(
		{ name: tool.name, arguments: sanitizedToolArguments },
		CallToolResultSchema,
		{ timeout },
	);
	returnData.push({
		json: { response: result.content as IDataObject },
		pairedItem: { item: itemIndex },
	});
}

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
		onUnauthorized: async (headers) =>
			await tryRefreshOAuth2Token(ctx, config.authentication, headers),
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
		version: [1, 1.1, 1.2, 1.3],
		description: 'Connect tools from an MCP Server',
		defaults: {
			name: 'MCP Client',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
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
		credentials,
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
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.2 } }],
					},
				},
			},
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
						name: 'MCP OAuth2',
						value: 'mcpOAuth2Api',
					},
					{
						name: 'Multiple Headers Auth',
						value: 'multipleHeadersAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate with your endpoint',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: {
					show: {
						authentication: ['headerAuth', 'bearerAuth', 'mcpOAuth2Api', 'multipleHeadersAuth'],
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

		const setError = (error: NodeOperationError): SupplyData => {
			this.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
			throw error;
		};

		const { client, mcpTools, error } = await connectAndGetTools(this, config);

		if (error) {
			this.logger.error('McpClientTool: Failed to connect to MCP Server', { error });
			return setError(mapToNodeOperationError(node, error));
		}

		this.logger.debug('McpClientTool: Successfully connected to MCP Server');

		if (!mcpTools?.length) {
			return setError(
				new NodeOperationError(node, 'MCP Server returned no tools', {
					itemIndex,
					description:
						'Connected successfully to your MCP server but it returned an empty list of tools.',
				}),
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

		const toolkit = new StructuredToolkit(tools);

		return { response: toolkit, closeFunction: async () => await client.close() };
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const node = this.getNode();
		const items = this.getInputData();
		const useClientCache = node.typeVersion >= 1.3;
		const returnData: INodeExecutionData[] = [];

		if (useClientCache) {
			const logger = narrowLogger(this);
			const cacheKey = getCacheKey(this.getExecutionId(), node.name);
			const manager = Container.get(McpClientsManager);
			const { client, mcpTools } = await manager.getOrConnect(
				cacheKey,
				async () => await connectOrThrow(this, 0),
				{
					logger,
					onExecutionCancellation: this.onExecutionCancellation?.bind(this),
				},
			);

			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const timeout = this.getNodeParameter('options.timeout', itemIndex, 60000) as number;
				await appendToolResults({
					node,
					item: items[itemIndex],
					mcpTools,
					client,
					timeout,
					itemIndex,
					returnData,
				});
			}

			// Refresh idle timer at end — keeps long-running agents alive even when
			// callTool() runs longer than the eviction interval.
			manager.refresh(cacheKey);
			return [returnData];
		}

		// v1.2 and below: per-item connection (preserves expression-based per-item config).
		// Pre-existing behavior: client is left open after the loop (matches pre-1.3).
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const { client, mcpTools } = await connectOrThrow(this, itemIndex);
			const timeout = this.getNodeParameter('options.timeout', itemIndex, 60000) as number;
			await appendToolResults({
				node,
				item: items[itemIndex],
				mcpTools,
				client,
				timeout,
				itemIndex,
				returnData,
			});
		}

		return [returnData];
	}
}
