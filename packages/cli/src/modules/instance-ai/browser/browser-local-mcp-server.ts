import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import { mcpToolCallResultSchema, mcpToolSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';
import type { BrowserToolkit, ToolContext, ToolDefinition } from '@n8n/mcp-browser';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class BrowserLocalMcpServer implements LocalMcpServer {
	private readonly toolsByName = new Map<string, ToolDefinition>();

	private readonly mcpTools: McpTool[] = [];

	constructor(
		toolkit: BrowserToolkit,
		private readonly toolContext: ToolContext,
		private readonly logger: Logger,
	) {
		for (const tool of toolkit.tools) {
			const candidate = {
				name: tool.name,
				description: tool.description,
				inputSchema: zodToJsonSchema(tool.inputSchema),
				annotations: { category: 'browser' },
			};
			const parsed = mcpToolSchema.safeParse(candidate);
			if (!parsed.success) {
				this.logger.warn('Skipping browser tool with unsupported input schema', {
					tool: tool.name,
				});
				continue;
			}

			this.toolsByName.set(tool.name, tool);
			this.mcpTools.push(parsed.data);
		}
	}

	getAvailableTools(): McpTool[] {
		return this.mcpTools;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.mcpTools : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const tool = this.toolsByName.get(req.name);
		if (!tool) {
			return errorResult(`Unknown browser tool: ${req.name}`);
		}

		try {
			const args: unknown = tool.inputSchema.parse(req.arguments);
			const result = await tool.execute(args, this.toolContext);
			const parsed = mcpToolCallResultSchema.safeParse(result);
			if (parsed.success) {
				return parsed.data;
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(result.content) }],
				...(result.isError === true ? { isError: true } : {}),
			};
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	}
}

function errorResult(message: string): McpToolCallResult {
	return { content: [{ type: 'text', text: message }], isError: true };
}
