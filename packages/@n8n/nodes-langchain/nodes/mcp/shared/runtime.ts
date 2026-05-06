import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { logWrapper } from '@n8n/ai-utilities';
import type { JSONSchema7 } from 'json-schema';
import pick from 'lodash/pick';
import { StructuredToolkit } from 'n8n-core';
import {
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	NodeConnectionTypes,
	NodeOperationError,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import {
	buildMcpToolName,
	createCallTool,
	getSelectedTools,
	mcpToolToDynamicTool,
} from '../McpClientTool/utils';
import type { McpToolIncludeMode } from '../McpClientTool/types';
import type { McpAuthenticationOption, McpServerTransport } from './types';
import {
	connectMcpClient,
	getAllTools,
	getAuthHeaders,
	isStructuredContent,
	mapToNodeOperationError,
	tryRefreshOAuth2Token,
} from './utils';

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

async function connectAndGetTools(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	config: ResolvedMcpConfig,
) {
	const node = ctx.getNode();
	const { headers } = await getAuthHeaders(ctx, config.authentication);

	const client = await connectMcpClient({
		serverTransport: config.transport,
		endpointUrl: config.endpointUrl,
		headers,
		name: node.type,
		version: node.typeVersion,
		onUnauthorized: async (h) => await tryRefreshOAuth2Token(ctx, config.authentication, h),
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
 * Execute a single MCP tool call from an agent toolkit invocation.
 *
 * The agent passes `item.json.tool` (the prefixed tool name) and the tool arguments
 * inline on `item.json`. We sanitize the arguments against the tool's input schema
 * and forward the call to the MCP server.
 */
export async function executeMcpTool(
	ctx: IExecuteFunctions,
	resolveConfig: (itemIndex: number) => ResolvedMcpConfig | Promise<ResolvedMcpConfig>,
): Promise<INodeExecutionData[][]> {
	const node = ctx.getNode();
	const items = ctx.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const signal = ctx.getExecutionCancelSignal();
		if (signal?.aborted) {
			throw new NodeOperationError(node, 'Execution was cancelled', { itemIndex });
		}

		const item = items[itemIndex];
		const config = await resolveConfig(itemIndex);
		const { client, mcpTools, error } = await connectAndGetTools(ctx, config);

		if (error) {
			throw new NodeOperationError(node, error.error, { itemIndex });
		}

		try {
			if (!mcpTools?.length) {
				throw new NodeOperationError(node, 'MCP Server returned no tools', { itemIndex });
			}

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
						timeout: config.timeout,
						signal: ctx.getExecutionCancelSignal(),
					},
				);

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
	const { headers } = await getAuthHeaders(ctx, config.authentication);

	const client = await connectMcpClient({
		serverTransport: config.transport,
		endpointUrl: config.endpointUrl,
		headers,
		name: node.type,
		version: node.typeVersion,
		onUnauthorized: async (h) => await tryRefreshOAuth2Token(ctx, config.authentication, h),
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
