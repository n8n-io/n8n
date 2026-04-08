import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchema7 } from 'json-schema';
import pick from 'lodash/pick';
import { StructuredToolkit } from 'n8n-core';
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

import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

import { getTools } from './loadOptions';
import type { McpToolIncludeMode } from './types';
import { createCallTool, getSelectedTools, mcpToolToDynamicTool } from './utils';
import { credentials, transportSelect } from '../shared/descriptions';
import type { McpAuthenticationOption, McpServerTransport, McpTool } from '../shared/types';
import {
	connectMcpClient,
	getAllTools,
	getAuthHeaders,
	mapToNodeOperationError,
	tryRefreshOAuth2Token,
} from '../shared/utils';

const DEFAULT_CACHE_TTL_MS = 300_000;
const DEFAULT_CACHE_MAX_SIZE = 500;

const N8N_MCP_CLIENT_CACHE_TTL_MS =
	parseInt(process.env.N8N_MCP_CLIENT_CACHE_TTL_MS ?? '', 10) || DEFAULT_CACHE_TTL_MS;
const N8N_MCP_CLIENT_CACHE_MAX_SIZE =
	parseInt(process.env.N8N_MCP_CLIENT_CACHE_MAX_SIZE ?? '', 10) || DEFAULT_CACHE_MAX_SIZE;

interface CachedClient {
	client: Client;
	mcpTools: McpTool[];
	createdAt: number;
}

/**
 * Cache of live MCP clients keyed by `executionId:nodeName`.
 * Keeps the transport alive between tool calls within the same execution,
 * which is required for stateful MCP servers (e.g. Playwright).
 */
export const activeClients = new Map<string, CachedClient>();

function getCacheKey(executionId: string, nodeName: string): string {
	return `${executionId}:${nodeName}`;
}

function closeAndRemove(key: string): void {
	const entry = activeClients.get(key);
	if (entry) {
		void entry.client.close().catch(() => {});
		activeClients.delete(key);
	}
}

let lastEvictionAt = 0;
const EVICTION_INTERVAL_MS = 30_000;

/** Reset the eviction timer — exported for testing only. */
export function resetEvictionTimer(): void {
	lastEvictionAt = 0;
}

/** Evict stale entries (TTL) and enforce max cache size. */
export function evictStaleClients(): void {
	const now = Date.now();
	if (now - lastEvictionAt < EVICTION_INTERVAL_MS) return;
	lastEvictionAt = now;

	for (const [key, entry] of activeClients) {
		if (now - entry.createdAt > N8N_MCP_CLIENT_CACHE_TTL_MS) {
			closeAndRemove(key);
		}
	}

	// Map preserves insertion order, which matches createdAt order since
	// entries are only inserted (never re-set) with Date.now() timestamps.
	if (activeClients.size > N8N_MCP_CLIENT_CACHE_MAX_SIZE) {
		let excess = activeClients.size - N8N_MCP_CLIENT_CACHE_MAX_SIZE;
		for (const [key] of activeClients) {
			if (excess <= 0) break;
			closeAndRemove(key);
			excess--;
		}
	}
}

/** Connect to MCP server and return client + tools, or throw on failure. */
async function connectOrThrow(
	ctx: IExecuteFunctions,
): Promise<{ client: Client; mcpTools: McpTool[] }> {
	const node = ctx.getNode();
	const config = getNodeConfig(ctx, 0);
	const result = await connectAndGetTools(ctx, config);

	if (result.error) {
		throw new NodeOperationError(node, result.error.error, { itemIndex: 0 });
	}

	if (!result.mcpTools?.length) {
		throw new NodeOperationError(node, 'MCP Server returned no tools', { itemIndex: 0 });
	}

	return { client: result.client, mcpTools: result.mcpTools };
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
		const returnData: INodeExecutionData[] = [];
		const useClientCache = node.typeVersion >= 1.3;

		let client: Client;
		let mcpTools: McpTool[];

		if (useClientCache) {
			evictStaleClients();

			const cacheKey = getCacheKey(this.getExecutionId(), node.name);
			const cached = activeClients.get(cacheKey);

			if (cached) {
				client = cached.client;
				mcpTools = cached.mcpTools;
			} else {
				({ client, mcpTools } = await connectOrThrow(this));

				activeClients.set(cacheKey, { client, mcpTools, createdAt: Date.now() });

				const cancelSignal = this.getExecutionCancelSignal();
				if (cancelSignal) {
					cancelSignal.addEventListener('abort', () => closeAndRemove(cacheKey), {
						once: true,
					});
				}
			}
		} else {
			({ client, mcpTools } = await connectOrThrow(this));
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			const timeout = this.getNodeParameter('options.timeout', itemIndex, 60000) as number;

			for (const tool of mcpTools) {
				if (!item.json.tool || typeof item.json.tool !== 'string') {
					throw new NodeOperationError(node, 'Tool name not found in item.json.tool or item.tool', {
						itemIndex,
					});
				}

				const toolName = item.json.tool;
				if (toolName === tool.name) {
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
