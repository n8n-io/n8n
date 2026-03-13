import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { convertJsonSchemaToZod } from 'zod-from-json-schema-v3';
import type { JSONSchema } from 'zod-from-json-schema-v3';

import { sanitizeMcpToolSchemas } from '../../agent/sanitize-mcp-schemas';
import type { LocalMcpServer } from '../../types';

/**
 * Build Mastra tools dynamically from the MCP tools advertised by a connected
 * local MCP server (e.g. the fs-proxy daemon).
 *
 * Each tool's input schema is converted from the daemon's JSON Schema definition
 * to a Zod schema so the LLM receives accurate parameter information. Falls back
 * to `z.record(z.unknown())` if conversion fails for a particular tool.
 *
 * The execute function forwards the call via `server.callTool()` and returns
 * the full MCP result. A `toModelOutput` callback converts MCP content blocks
 * (text and image) into the AI SDK's multimodal format so the LLM receives images.
 */
export function createToolsFromLocalMcpServer(server: LocalMcpServer): ToolsInput {
	const tools: ToolsInput = {};

	for (const mcpTool of server.getAvailableTools()) {
		const toolName = mcpTool.name;
		const description = mcpTool.description ?? toolName;

		let inputSchema: z.ZodTypeAny;
		try {
			// Convert JSON Schema → Zod (v3) so the LLM sees the actual parameter shapes.
			// McpTool.inputSchema properties are typed as Record<string, unknown> to
			// accommodate arbitrary JSON Schema values; the cast is safe here because
			// the daemon always sends valid JSON Schema objects.
			inputSchema = convertJsonSchemaToZod(mcpTool.inputSchema as JSONSchema);
		} catch {
			// Fallback: accept any object if conversion fails
			inputSchema = z.record(z.unknown());
		}

		tools[toolName] = createTool({
			id: toolName,
			description,
			inputSchema,
			execute: async (args: Record<string, unknown>) => {
				const result = await server.callTool({
					name: toolName,
					arguments: args,
				});
				return result;
			},
			toModelOutput: (result: unknown) => {
				// Mastra passes { toolCallId, input, output } — unwrap to get the actual MCP result.
				// Handle both shapes for forward-compatibility.
				const raw = (
					result !== null && typeof result === 'object' && 'output' in result
						? (result as { output: unknown }).output
						: result
				) as {
					content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
					structuredContent?: Record<string, unknown>;
				};

				if (!raw?.content || !Array.isArray(raw.content)) {
					return { type: 'text', value: JSON.stringify(result) };
				}

				const hasMedia = raw.content.some((item) => item.type === 'image');

				// When we have structuredContent and no media, prefer it as compact text
				if (raw.structuredContent && !hasMedia) {
					return {
						type: 'content',
						value: [{ type: 'text' as const, text: JSON.stringify(raw.structuredContent) }],
					};
				}

				// Convert MCP 'image' → Mastra 'media' (Mastra translates to 'image-data' for the provider)
				const value = raw.content.map((item) => {
					if (item.type === 'image') {
						return {
							type: 'media' as const,
							data: item.data ?? '',
							mediaType: item.mimeType ?? 'image/jpeg',
						};
					}
					return { type: 'text' as const, text: item.text ?? '' };
				});
				return { type: 'content', value };
			},
		});
	}

	return sanitizeMcpToolSchemas(tools);
}
