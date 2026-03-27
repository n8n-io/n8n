import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchema7 } from 'json-schema';

import type { McpCallToolResult, McpConnection } from './mcp-connection';
import type { AgentMessage, ContentFile, ContentText } from '../types/sdk/message';
import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../types/sdk/tool';

type McpContentBlock = McpCallToolResult['content'][number];

/**
 * Convert raw MCP tool definitions into BuiltTool instances.
 * Tool names are prefixed with the server name to prevent collisions.
 * Not publicly exported.
 */
export class McpToolResolver {
	resolve(connection: McpConnection, tools: Tool[]): BuiltTool[] {
		return tools.map((tool) => this.resolveTool(connection, tool));
	}

	private resolveTool(connection: McpConnection, tool: Tool): BuiltTool {
		const prefixedName = `${connection.name}_${tool.name}`;
		const originalName = tool.name;

		const handler = async (
			input: unknown,
			_ctx: ToolContext | InterruptibleToolContext,
		): Promise<unknown> => {
			const args = (input ?? {}) as Record<string, unknown>;
			return await connection.callTool(originalName, args);
		};

		const toMessage = (output: unknown): AgentMessage | undefined => {
			return buildRichMessage(output as McpCallToolResult);
		};

		const builtTool: BuiltTool = {
			name: prefixedName,
			description: tool.description ?? '',
			inputSchema: tool.inputSchema as JSONSchema7,
			handler,
			toMessage,
			mcpTool: true,
			mcpServerName: connection.name,
		};

		return builtTool;
	}
}

/**
 * Convert an MCP CallToolResult into a rich AgentMessage containing text and image content parts.
 * Returns undefined if the result contains only text (the tool-result JSON is sufficient for the LLM).
 * Returns an assistant Message with ContentFile parts for image blocks so multimodal models can process them.
 */
function buildRichMessage(result: McpCallToolResult): AgentMessage | undefined {
	if (!result?.content) return undefined;

	const hasImages = result.content.some((block) => block.type === 'image');
	if (!hasImages) return undefined;

	const contentParts: Array<ContentText | ContentFile> = [];

	for (const block of result.content) {
		const part = blockToContentPart(block);
		if (part) contentParts.push(part);
	}

	if (contentParts.length === 0) return undefined;

	return { role: 'assistant', content: contentParts };
}

function blockToContentPart(block: McpContentBlock): ContentText | ContentFile | undefined {
	if (block.type === 'text' && block.text) {
		return { type: 'text', text: block.text };
	}

	if (block.type === 'image' && block.data) {
		return {
			type: 'file',
			data: block.data,
			mediaType: block.mimeType ?? 'image/png',
		};
	}

	if (block.type === 'resource' && block.resource) {
		const text = 'text' in block.resource ? block.resource.text : block.resource.uri;
		return { type: 'text', text };
	}

	return undefined;
}
