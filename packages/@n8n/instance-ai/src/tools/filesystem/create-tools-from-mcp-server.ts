import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { convertJsonSchemaToZod } from 'zod-from-json-schema-v3';
import type { JSONSchema } from 'zod-from-json-schema-v3';

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
			execute: async (args) => {
				const result = await server.callTool({
					name: toolName,
					arguments: args as Record<string, unknown>,
				});
				return result.content;
			},
			toModelOutput: (value: unknown) => {
				return { type: 'content', value };
			},
		});
	}

	return tools;
}
