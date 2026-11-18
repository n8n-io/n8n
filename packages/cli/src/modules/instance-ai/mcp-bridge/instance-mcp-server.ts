import type { CallToolResult, Tool } from '@modelcontextprotocol/client';
import type { McpToolAnnotations, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import type {
	InstanceMcpCallToolOptions,
	InstanceMcpCallToolResult,
	InstanceMcpServer,
	InstanceMcpToolDefinition,
	McpJsonSchema,
} from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

import type { InstanceMcpClient } from './instance-mcp-client';

type McpContentBlock = McpToolCallResult['content'][number];

/** The SDK types its schemas loosely; the shapes the bridge needs are JSON Schema objects. */
function isJsonSchema(value: unknown): value is McpJsonSchema {
	return isRecord(value);
}

function isAnnotations(value: unknown): value is McpToolAnnotations {
	return isRecord(value);
}

/** Keeps the content blocks the Assistant's result type knows; drops audio and links. */
function isSupportedContentBlock(value: unknown): value is McpContentBlock {
	if (!isRecord(value)) return false;
	if (value.type === 'text') return typeof value.text === 'string';
	if (value.type === 'image') {
		return typeof value.data === 'string' && typeof value.mimeType === 'string';
	}
	if (value.type === 'resource') {
		return (
			isRecord(value.resource) &&
			typeof value.resource.uri === 'string' &&
			typeof value.resource.blob === 'string'
		);
	}
	return false;
}

function toToolDefinition(tool: Tool): InstanceMcpToolDefinition {
	const inputSchema: unknown = tool.inputSchema;
	const outputSchema: unknown = tool.outputSchema;
	const annotations: unknown = tool.annotations;
	return {
		name: tool.name,
		...(tool.description !== undefined ? { description: tool.description } : {}),
		inputSchema: isJsonSchema(inputSchema) ? inputSchema : { type: 'object', properties: {} },
		...(isJsonSchema(outputSchema) ? { outputSchema } : {}),
		...(isAnnotations(annotations) ? { annotations } : {}),
		...(isRecord(tool._meta) ? { _meta: tool._meta } : {}),
	};
}

function toCallToolResult(result: CallToolResult): McpToolCallResult {
	return {
		content: result.content.filter(isSupportedContentBlock),
		...(isRecord(result.structuredContent) ? { structuredContent: result.structuredContent } : {}),
		...(result.isError === true ? { isError: true } : {}),
	};
}

/**
 * The instance MCP server as the `@n8n/instance-ai` package sees it: the tool
 * list is read once when the adapter is created, and every call goes through
 * the real client.
 */
export class InstanceMcpServerAdapter implements InstanceMcpServer {
	private constructor(
		private readonly client: InstanceMcpClient,
		private readonly tools: InstanceMcpToolDefinition[],
		readonly instructions: string | undefined,
	) {}

	static async create(client: InstanceMcpClient): Promise<InstanceMcpServerAdapter> {
		const tools = (await client.listTools()).map(toToolDefinition);
		return new InstanceMcpServerAdapter(client, tools, client.instructions);
	}

	getTools(): InstanceMcpToolDefinition[] {
		return this.tools;
	}

	async callTool(
		req: McpToolCallRequest,
		options: InstanceMcpCallToolOptions = {},
	): Promise<InstanceMcpCallToolResult> {
		const result = await this.client.callTool(req.name, req.arguments, {
			signal: options.abortSignal,
			inputResponses: options.inputResponses,
			requestState: options.requestState,
		});
		if (this.client.isInputRequired(result)) {
			return {
				resultType: 'input_required',
				...(result.inputRequests ? { inputRequests: result.inputRequests } : {}),
				...(result.requestState !== undefined ? { requestState: result.requestState } : {}),
			};
		}
		return toCallToolResult(result);
	}

	async close(): Promise<void> {
		await this.client.close();
	}
}
