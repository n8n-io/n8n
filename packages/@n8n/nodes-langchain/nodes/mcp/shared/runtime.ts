import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { logWrapper } from '@n8n/ai-utilities';
import { Container } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import pick from 'lodash/pick';
import { StructuredToolkit } from 'n8n-core';
import {
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INode,
	type INodeExecutionData,
	type INodePropertyOptions,
	NodeConnectionTypes,
	NodeOperationError,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { McpClientsManager } from './McpClientsManager';
import type { McpAuthenticationOption, McpServerTransport, McpTool } from './types';
import {
	connectMcpClientForCredential,
	getAllTools,
	isStructuredContent,
	mapToNodeOperationError,
} from './utils';
import type { McpToolIncludeMode } from '../McpClientTool/types';
import {
	buildMcpToolName,
	createCallTool,
	getErrorDescriptionFromToolCall,
	getSelectedTools,
	mcpToolToDynamicTool,
} from '../McpClientTool/utils';

/**
 * Connection config used to open an MCP client. Shared across `supplyData`,
 * `execute`, and `loadOptions` paths so all three connect the same way.
 */
export type McpConnectionConfig = {
	authentication: McpAuthenticationOption;
	transport: McpServerTransport;
	endpointUrl: string;
	timeout: number;
};

/**
 * Connection config plus the tool-filter to apply at agent-toolkit build time.
 * Produced by both the parameter-driven {@link McpClientTool} and the
 * registry-driven `McpRegistryClientTool`; the runtime functions below are
 * unaware of where the values came from.
 */
export type ResolvedMcpConfig = McpConnectionConfig & {
	toolFilter: {
		mode: McpToolIncludeMode;
		includeTools: string[];
		excludeTools: string[];
	};
};

/**
 * Connects to an MCP server, retrieves available tools, and returns the connected client along with the filtered tools.
 *
 * Attempts to obtain authentication headers from the provided context, open an MCP client, and fetch all tools from the server.
 * On success returns the connected client and the tools filtered according to `config.toolFilter`. If the connection attempt fails,
 * returns the connection result with `mcpTools` set to `null` and `error` populated. If tool retrieval or filtering throws, the opened
 * client is closed before the error is rethrown.
 *
 * @param ctx - The n8n supply/execute context used to obtain node identity, authentication helpers, and an optional execution cancellation signal.
 * @param config - Resolved MCP connection configuration including transport, endpoint, authentication, timeout, and `toolFilter`.
 * @returns An object with `client` (the connected MCP client on success or the connection result on failure), `mcpTools` (the filtered tool list or `null` if connection failed), and `error` (`null` on success or the connection error on failure).
 */
async function connectAndGetTools(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	config: ResolvedMcpConfig,
) {
	const client = await connectMcpClientForCredential(ctx, {
		authentication: config.authentication,
		serverTransport: config.transport,
		endpointUrl: config.endpointUrl,
		surface: 'MCP Client Tool',
		signal: ctx.getExecutionCancelSignal?.(),
	});

	if (!client.ok) {
		return { client, mcpTools: null, error: client.error };
	}

	try {
		const allTools = await getAllTools(client.result);
		const mcpTools = getSelectedTools({
			tools: allTools,
			mode: config.toolFilter.mode,
			includeTools: config.toolFilter.includeTools,
			excludeTools: config.toolFilter.excludeTools,
		});
		return { client: client.result, mcpTools, error: null };
	} catch (error) {
		await client.result.close();
		throw error;
	}
}

/**
 * Build a {@link StructuredToolkit} from a connected MCP server.
 *
 * Used by `supplyData` on every MCP-client-style node. Connects, lists tools,
 * filters them, wraps each in a `DynamicStructuredTool`, and returns the toolkit
 * along with a `closeFunction` that releases the client.
 */
export async function buildMcpToolkit(
	ctx: ISupplyDataFunctions,
	itemIndex: number,
	config: ResolvedMcpConfig,
): Promise<SupplyData> {
	const node = ctx.getNode();

	const setError = (error: NodeOperationError): SupplyData => {
		ctx.addOutputData(NodeConnectionTypes.AiTool, itemIndex, error);
		throw error;
	};

	const signal = ctx.getExecutionCancelSignal();
	if (signal?.aborted) {
		return setError(new NodeOperationError(node, 'Execution was cancelled', { itemIndex }));
	}

	const { client, mcpTools, error } = await connectAndGetTools(ctx, config);

	if (error) {
		ctx.logger.error('MCP client: Failed to connect to MCP Server', { error });
		return setError(mapToNodeOperationError(node, error));
	}

	ctx.logger.debug('MCP client: Successfully connected to MCP Server');

	if (!mcpTools?.length) {
		await client.close();
		return setError(
			new NodeOperationError(node, 'MCP Server returned no tools', {
				itemIndex,
				description:
					'Connected successfully to your MCP server but it returned an empty list of tools.',
			}),
		);
	}

	try {
		const tools = mcpTools.map((tool) => {
			const prefixedName = buildMcpToolName(node.name, tool.name);
			return logWrapper(
				mcpToolToDynamicTool(
					{ ...tool, name: prefixedName },
					createCallTool(
						tool.name,
						client,
						config.timeout,
						(errorMessage) => {
							const callError = new NodeOperationError(node, errorMessage, { itemIndex });
							void ctx.addOutputData(NodeConnectionTypes.AiTool, itemIndex, callError);
							ctx.logger.error(`MCP client: Tool "${tool.name}" failed to execute`, {
								error: callError,
							});
						},
						() => ctx.getExecutionCancelSignal(),
					),
				),
				ctx,
			);
		});

		ctx.logger.debug(`MCP client: Connected to MCP Server with ${tools.length} tools`);

		const toolkit = new StructuredToolkit(tools);

		return { response: toolkit, closeFunction: async () => await client.close() };
	} catch (e) {
		await client.close();
		throw e;
	}
}

/**
 * Connect to the MCP server and return the client + filtered tools, or throw a
 * `NodeOperationError` on connection failure or an empty tool list. The
 * `connectOrThrow` counterpart to {@link connectAndGetTools}.
 */
async function connectOrThrow(
	ctx: IExecuteFunctions,
	config: ResolvedMcpConfig,
	itemIndex: number,
): Promise<{ client: Client; mcpTools: McpTool[] }> {
	const node = ctx.getNode();
	const { client, mcpTools, error } = await connectAndGetTools(ctx, config);

	if (error) {
		throw new NodeOperationError(node, error.error, { itemIndex });
	}
	if (!mcpTools?.length) {
		await client.close();
		throw new NodeOperationError(node, 'MCP Server returned no tools', { itemIndex });
	}

	return { client, mcpTools };
}

/**
 * Run the tool named in `item.json.tool` against the connected client and push
 * the result onto `returnData`. Shared by the cached and non-cached execute paths.
 */
async function runToolCall(opts: {
	ctx: IExecuteFunctions;
	node: INode;
	item: INodeExecutionData;
	mcpTools: McpTool[];
	client: Client;
	timeout: number;
	itemIndex: number;
	returnData: INodeExecutionData[];
}): Promise<void> {
	const { ctx, node, item, mcpTools, client, timeout, itemIndex, returnData } = opts;

	if (!item.json.tool || typeof item.json.tool !== 'string') {
		throw new NodeOperationError(node, 'Tool name not found in item.json.tool or item.tool', {
			itemIndex,
		});
	}

	const toolName = item.json.tool;
	for (const tool of mcpTools) {
		const prefixedName = buildMcpToolName(node.name, tool.name);
		if (toolName !== prefixedName) continue;

		const { tool: _, ...toolArguments } = item.json;
		const schema: JSONSchema7 = tool.inputSchema;
		const sanitizedToolArguments: IDataObject =
			schema.additionalProperties !== true
				? pick(toolArguments, Object.keys(schema.properties ?? {}))
				: toolArguments;

		const result = await client.callTool(
			{ name: tool.name, arguments: sanitizedToolArguments },
			CallToolResultSchema,
			{
				timeout,
				signal: ctx.getExecutionCancelSignal(),
			},
		);

		if (node.typeVersion >= 1.3 && result.isError) {
			const errorMessage =
				getErrorDescriptionFromToolCall(result) ?? `Tool "${tool.name}" returned an error`;
			throw new NodeOperationError(node, errorMessage, { itemIndex });
		}

		returnData.push({
			json: {
				response: result.content as IDataObject,
				...(isStructuredContent(result.structuredContent) && {
					structuredContent: result.structuredContent,
				}),
			},
			pairedItem: { item: itemIndex },
		});
	}
}

/**
 * Execute a single MCP tool call from an agent toolkit invocation.
 *
 * The agent passes `item.json.tool` (the prefixed tool name) and the tool arguments
 * inline on `item.json`. We sanitize the arguments against the tool's input schema
 * and forward the call to the MCP server.
 *
 * When `enableSessionCache` is set, the connected client is kept alive in
 * {@link McpClientsManager} and reused across tool calls within the same execution,
 * so stateful MCP servers keep their session between Agent V3 tool calls. Otherwise
 * a fresh connection is opened and closed per call (legacy behaviour).
 */
export async function executeMcpTool(
	ctx: IExecuteFunctions,
	resolveConfig: (itemIndex: number) => ResolvedMcpConfig | Promise<ResolvedMcpConfig>,
	options: { enableSessionCache?: boolean } = {},
): Promise<INodeExecutionData[][]> {
	const node = ctx.getNode();
	const items = ctx.getInputData();
	const returnData: INodeExecutionData[] = [];

	const assertNotCancelled = (itemIndex: number): void => {
		if (ctx.getExecutionCancelSignal()?.aborted) {
			throw new NodeOperationError(node, 'Execution was cancelled', { itemIndex });
		}
	};

	// Require a real execution id: without one the cache key would collide across
	// concurrent executions (e.g. `undefined:NodeName`) and leak a session between
	// them. Fall back to the per-call connection in that case.
	const executionId = ctx.getExecutionId();

	if (options.enableSessionCache && executionId) {
		assertNotCancelled(0);

		const manager = Container.get(McpClientsManager);
		const cacheKey = `${executionId}:${node.name}`;
		// One cached client per execution+node, connected with the first item's
		// config. Agent tool dispatch always sends a single item, so per-item
		// connection config does not apply here (only per-item `timeout` below).
		const firstConfig = await resolveConfig(0);

		const { client, mcpTools } = await manager.getOrConnect(
			cacheKey,
			async () => await connectOrThrow(ctx, firstConfig, 0),
			{
				logger: ctx.logger,
				onExecutionCancellation: ctx.onExecutionCancellation?.bind(ctx),
			},
		);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			assertNotCancelled(itemIndex);
			const config = await resolveConfig(itemIndex);
			await runToolCall({
				ctx,
				node,
				item: items[itemIndex],
				mcpTools,
				client,
				timeout: config.timeout,
				itemIndex,
				returnData,
			});
		}

		// Bump the entry's idle timer at the end so the session survives the gap
		// until the next tool call (e.g. agent/LLM latency) without being evicted.
		manager.refresh(cacheKey);
		return [returnData];
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		assertNotCancelled(itemIndex);

		const config = await resolveConfig(itemIndex);
		const { client, mcpTools } = await connectOrThrow(ctx, config, itemIndex);

		try {
			await runToolCall({
				ctx,
				node,
				item: items[itemIndex],
				mcpTools,
				client,
				timeout: config.timeout,
				itemIndex,
				returnData,
			});
		} finally {
			await client.close();
		}
	}

	return [returnData];
}

/**
 * Connect to an MCP server and return its tool list as `INodePropertyOptions[]`
 * for use in a `loadOptionsMethod` dropdown. Both the parameter-driven and
 * registry-driven nodes call this — they only differ in how `config` is built.
 */
export async function loadMcpToolOptions(
	ctx: ILoadOptionsFunctions,
	config: McpConnectionConfig,
): Promise<INodePropertyOptions[]> {
	const node = ctx.getNode();
	const client = await connectMcpClientForCredential(ctx, {
		authentication: config.authentication,
		serverTransport: config.transport,
		endpointUrl: config.endpointUrl,
		surface: 'MCP Client Tool',
	});

	if (!client.ok) {
		throw mapToNodeOperationError(node, client.error);
	}

	try {
		const tools = await getAllTools(client.result);
		return tools.map((tool) => ({
			name: tool.name,
			value: tool.name,
			description: tool.description,
			inputSchema: tool.inputSchema,
		}));
	} finally {
		await client.result.close();
	}
}
