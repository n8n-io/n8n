import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
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
	lastUsedAt: number;
}

/**
 * Cache of live MCP clients keyed by `executionId:nodeName`.
 * Keeps the transport alive between tool calls within the same execution,
 * which is required for stateful MCP servers (e.g. Playwright).
 */
export const activeClients = new Map<string, CachedClient>();

/**
 * In-flight connection promises to dedupe concurrent cache misses for the
 * same key — prevents two parallel tool dispatches from racing to connect
 * and orphaning one of the resulting clients.
 */
const pendingConnections = new Map<string, Promise<{ client: Client; mcpTools: McpTool[] }>>();

function getCacheKey(executionId: string, nodeName: string): string {
	return `${executionId}:${nodeName}`;
}

type CloseLogger = Pick<IExecuteFunctions['logger'], 'warn' | 'debug'> | undefined;

function closeAndRemove(key: string, logger?: CloseLogger): void {
	const entry = activeClients.get(key);
	if (!entry) return;

	activeClients.delete(key);
	void entry.client.close().catch((error) => {
		logger?.warn('McpClientTool: failed to close cached client', { cacheKey: key, error });
	});
}

let lastEvictionAt = 0;
const EVICTION_INTERVAL_MS = 30_000;

/** Reset the eviction timer — exported for testing only. */
export function resetEvictionTimer(): void {
	lastEvictionAt = 0;
}

/** Evict idle entries (TTL on lastUsedAt) and enforce max cache size. */
export function evictStaleClients(logger?: CloseLogger): void {
	const now = Date.now();
	if (now - lastEvictionAt < EVICTION_INTERVAL_MS) return;
	lastEvictionAt = now;

	for (const [key, entry] of activeClients) {
		if (now - entry.lastUsedAt > N8N_MCP_CLIENT_CACHE_TTL_MS) {
			logger?.debug('McpClientTool: evicting idle client', { cacheKey: key });
			closeAndRemove(key, logger);
		}
	}

	// Map preserves insertion order, which matches createdAt order since
	// entries are only inserted (never re-set) with Date.now() timestamps.
	if (activeClients.size > N8N_MCP_CLIENT_CACHE_MAX_SIZE) {
		let excess = activeClients.size - N8N_MCP_CLIENT_CACHE_MAX_SIZE;
		for (const [key] of activeClients) {
			if (excess <= 0) break;
			logger?.debug('McpClientTool: evicting oldest client (max size)', { cacheKey: key });
			closeAndRemove(key, logger);
			excess--;
		}
	}
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

/**
 * Wire transport-level lifecycle so cache evicts when server drops the
 * connection or transport errors out — prevents handing dead clients
 * back to subsequent tool calls.
 */
function attachTransportLifecycle(client: Client, cacheKey: string, logger: CloseLogger): void {
	const prevOnClose = client.onclose;
	client.onclose = () => {
		logger?.debug('McpClientTool: transport closed, evicting cache entry', { cacheKey });
		activeClients.delete(cacheKey);
		prevOnClose?.();
	};

	const prevOnError = client.onerror;
	client.onerror = (error: Error) => {
		logger?.warn('McpClientTool: transport error, evicting cache entry', { cacheKey, error });
		activeClients.delete(cacheKey);
		prevOnError?.(error);
	};
}

/**
 * v1.3+ execute path: cache live Client across tool calls within an execution.
 * Standalone (not method) so `this` binding works with mock test contexts.
 */
async function executeWithCache(
	ctx: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[][]> {
	const node = ctx.getNode();
	const returnData: INodeExecutionData[] = [];
	const logger: CloseLogger = ctx.logger;

	evictStaleClients(logger);

	const cacheKey = getCacheKey(ctx.getExecutionId(), node.name);
	let cached = activeClients.get(cacheKey);

	if (cached) {
		logger?.debug?.('McpClientTool: cache hit', { cacheKey });
		cached.lastUsedAt = Date.now();
	} else {
		// Dedupe concurrent cache misses for same key — prevents racing
		// connects from leaking transports.
		let pending = pendingConnections.get(cacheKey);
		if (pending) {
			logger?.debug?.('McpClientTool: awaiting in-flight connection', { cacheKey });
			await pending;
		} else {
			logger?.debug?.('McpClientTool: cache miss, connecting', { cacheKey });
			pending = connectOrThrow(ctx, 0);
			pendingConnections.set(cacheKey, pending);
			try {
				const { client, mcpTools } = await pending;
				const now = Date.now();
				activeClients.set(cacheKey, { client, mcpTools, createdAt: now, lastUsedAt: now });
				attachTransportLifecycle(client, cacheKey, logger);
				ctx.onExecutionCancellation?.(() => closeAndRemove(cacheKey, logger));
			} finally {
				pendingConnections.delete(cacheKey);
			}
		}
		cached = activeClients.get(cacheKey);
		if (!cached) {
			throw new NodeOperationError(node, 'Failed to populate MCP client cache', {
				itemIndex: 0,
			});
		}
	}

	const { client, mcpTools } = cached;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const item = items[itemIndex];
		const timeout = ctx.getNodeParameter('options.timeout', itemIndex, 60000) as number;
		await appendToolResults(node, item, mcpTools, client, timeout, itemIndex, returnData);
	}

	// Refresh idle timer at end of each execute() — keeps long-running agents alive.
	const stillCached = activeClients.get(cacheKey);
	if (stillCached) stillCached.lastUsedAt = Date.now();

	return [returnData];
}

/** Run matching tool from item.json.tool against the MCP client and push result. */
async function appendToolResults(
	node: INode,
	item: INodeExecutionData,
	mcpTools: McpTool[],
	client: Client,
	timeout: number,
	itemIndex: number,
	returnData: INodeExecutionData[],
): Promise<void> {
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

		if (useClientCache) {
			return await executeWithCache(this, items);
		}

		// v1.2 and below: per-item connection (preserves expression-based per-item config).
		// Pre-existing behavior: client is left open after the loop (matches pre-1.3).
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			const { client, mcpTools } = await connectOrThrow(this, itemIndex);
			const timeout = this.getNodeParameter('options.timeout', itemIndex, 60000) as number;
			await appendToolResults(node, item, mcpTools, client, timeout, itemIndex, returnData);
		}

		return [returnData];
	}
}
