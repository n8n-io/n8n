import { Tool, hasMcpMediaContent, mcpContentToModelParts } from '@n8n/agents';
import type { McpToolCallResult } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { McpToolNameValidationError } from '../agent/mcp-tool-name-validation';
import { addSafeMcpTools, createClaimedToolNames } from '../agent/mcp-tool-name-validation';
import type { McpSchemaSanitizationError } from '../agent/sanitize-mcp-schemas';
import { sanitizeMcpToolSchemas } from '../agent/sanitize-mcp-schemas';
import type { Logger } from '../logger';
import { createToolRegistry } from '../tool-registry';
import type {
	InstanceAiToolRegistry,
	InstanceMcpCallToolResult,
	InstanceMcpServer,
} from '../types';

export const INSTANCE_MCP_SOURCE = 'instance MCP';

/** The `_meta` key the instance server stamps on a tool to name its tool group. */
export const INSTANCE_MCP_GROUP_META_KEY = 'n8n/group';

export interface InstanceMcpBridgedTools {
	tools: InstanceAiToolRegistry;
	/** Tool group by tool name, read from the server's `_meta`. */
	groups: Map<string, string>;
}

function isInputRequired(
	result: InstanceMcpCallToolResult,
): result is Extract<InstanceMcpCallToolResult, { resultType: 'input_required' }> {
	return 'resultType' in result && result.resultType === 'input_required';
}

function isMcpToolCallResult(value: unknown): value is McpToolCallResult {
	return isRecord(value) && Array.isArray(value.content);
}

/**
 * Builds native tools from the tools the instance MCP server lists. Names stay
 * as the server names them: these tools stand in for the Assistant's own
 * domain tools, and the catalog groups them by the server's `n8n/group`.
 *
 * Input schemas are the server's JSON Schema, passed through unchanged, so
 * the model sees exactly what an external MCP client sees.
 */
export function createToolsFromInstanceMcpServer({
	server,
	logger,
}: {
	server: InstanceMcpServer;
	logger: Logger;
}): InstanceMcpBridgedTools {
	const tools = createToolRegistry();
	const groups = new Map<string, string>();

	for (const definition of server.getTools()) {
		const toolName = definition.name;
		const group = definition._meta?.[INSTANCE_MCP_GROUP_META_KEY];
		if (typeof group === 'string') groups.set(toolName, group);

		const tool = new Tool(toolName)
			.description(definition.description ?? toolName)
			.input(definition.inputSchema)
			.handler(async (input: unknown, ctx) => {
				const result = await server.callTool(
					{ name: toolName, arguments: isRecord(input) ? input : {} },
					{ abortSignal: ctx.abortSignal },
				);
				if (isInputRequired(result)) {
					// M2 turns this into a suspension; until then the model learns the call stopped.
					return {
						content: [
							{
								type: 'text',
								text: `The tool asked for input before it acts (${Object.keys(
									result.inputRequests ?? {},
								).join(', ')}). Answering is not supported yet.`,
							},
						],
						isError: true,
					};
				}
				return result;
			})
			// A plain value lands in the message as JSON; only media needs the content shape.
			.toModelOutput((result: unknown) => {
				if (!isMcpToolCallResult(result)) return result;
				if (result.isError) return { error: mcpTextOf(result) };
				if (hasMcpMediaContent(result.content)) {
					return { type: 'content', value: mcpContentToModelParts(result.content) };
				}
				return result.structuredContent ?? mcpTextOf(result);
			})
			.build();

		tools.set(toolName, tool);
	}

	const sanitizedTools = sanitizeMcpToolSchemas(tools, {
		onError: (error: McpSchemaSanitizationError) => {
			logger.warn('Skipped instance MCP tool with unsupported schema', {
				toolName: error.details.toolName,
				source: INSTANCE_MCP_SOURCE,
				reason: error.message,
			});
		},
	});
	const safeTools = createToolRegistry();
	addSafeMcpTools(safeTools, sanitizedTools, {
		source: INSTANCE_MCP_SOURCE,
		claimedToolNames: createClaimedToolNames([]),
		warn: (error: McpToolNameValidationError) => {
			logger.warn('Skipped instance MCP tool with unsafe name', {
				toolName: error.toolName,
				source: error.source,
				reason: error.message,
			});
		},
	});
	return { tools: safeTools, groups };
}

function mcpTextOf(result: McpToolCallResult): string {
	return result.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('\n');
}
