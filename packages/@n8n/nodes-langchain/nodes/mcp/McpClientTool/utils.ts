import { DynamicStructuredTool, type DynamicStructuredToolInput } from '@langchain/core/tools';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { type IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { convertJsonSchemaToZod } from '@utils/schemaParsing';

import type { McpToolIncludeMode } from './types';
import type { McpTool } from '../shared/types';
import { isStructuredContent } from '../shared/utils';

export function getSelectedTools({
	mode,
	includeTools,
	excludeTools,
	tools,
}: {
	mode: McpToolIncludeMode;
	includeTools?: string[];
	excludeTools?: string[];
	tools: McpTool[];
}) {
	switch (mode) {
		case 'selected': {
			if (!includeTools?.length) return tools;
			const include = new Set(includeTools);
			return tools.filter((tool) => include.has(tool.name));
		}
		case 'except': {
			const except = new Set(excludeTools ?? []);
			return tools.filter((tool) => !except.has(tool.name));
		}
		case 'all':
		default:
			return tools;
	}
}

export const getErrorDescriptionFromToolCall = (result: unknown): string | undefined => {
	if (result && typeof result === 'object') {
		if ('content' in result && Array.isArray(result.content)) {
			const errorMessage = (result.content as Array<{ type: 'text'; text: string }>).find(
				(content) => content && typeof content === 'object' && typeof content.text === 'string',
			)?.text;
			return errorMessage;
		} else if ('toolResult' in result && typeof result.toolResult === 'string') {
			return result.toolResult;
		}
		if ('message' in result && typeof result.message === 'string') {
			return result.message;
		}
	}

	return undefined;
};

export const createCallTool =
	(
		name: string,
		client: Client,
		timeout: number,
		onError: (error: string) => void,
		getAbortSignal?: () => AbortSignal | undefined,
	) =>
	async (args: IDataObject) => {
		const signal = getAbortSignal?.();
		if (signal?.aborted) {
			return 'Execution was cancelled';
		}

		let result: Awaited<ReturnType<Client['callTool']>>;

		function handleError(error: unknown) {
			const errorDescription =
				getErrorDescriptionFromToolCall(error) ?? `Failed to execute tool "${name}"`;
			onError(errorDescription);
			return errorDescription;
		}

		try {
			result = await client.callTool({ name, arguments: args }, CompatibilityCallToolResultSchema, {
				timeout,
				signal: getAbortSignal?.(),
			});
		} catch (error) {
			// If the execution was cancelled mid-flight, treat it as cancellation, not a tool error
			if (getAbortSignal?.()?.aborted) {
				return 'Execution was cancelled';
			}
			return handleError(error);
		}

		if (result.isError) {
			return handleError(result);
		}

		if (result.toolResult !== undefined) {
			return result.toolResult;
		}

		if (isStructuredContent(result.structuredContent)) {
			return result.structuredContent;
		}

		if (result.content !== undefined) {
			return result.content;
		}

		return result;
	};

const MAX_MCP_TOOL_NAME_LENGTH = 64;

export function buildMcpToolName(serverName: string, toolName: string): string {
	const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9]/g, '_');
	const fullName = `${sanitizedServerName}_${toolName}`;
	if (fullName.length <= MAX_MCP_TOOL_NAME_LENGTH) {
		return fullName;
	}
	const maxPrefixLen = MAX_MCP_TOOL_NAME_LENGTH - toolName.length - 1;
	return maxPrefixLen > 0 ? `${sanitizedServerName.slice(0, maxPrefixLen)}_${toolName}` : toolName;
}

export function mcpToolToDynamicTool(
	tool: McpTool,
	onCallTool: DynamicStructuredToolInput['func'],
): DynamicStructuredTool {
	const rawSchema = convertJsonSchemaToZod(tool.inputSchema);

	// Ensure we always have an object schema for structured tools
	const objectSchema =
		rawSchema instanceof z.ZodObject ? rawSchema : z.object({ value: rawSchema });

	return new DynamicStructuredTool({
		name: tool.name,
		description: tool.description ?? '',
		schema: objectSchema,
		func: onCallTool,
		metadata: { isFromToolkit: true },
	});
}
