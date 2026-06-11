import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';

export function composeLocalMcpServers(
	logger: Logger,
	...servers: Array<LocalMcpServer | undefined>
): LocalMcpServer | undefined {
	const present = servers.filter((server): server is LocalMcpServer => server !== undefined);
	if (present.length === 0) {
		return undefined;
	}

	if (present.length === 1) {
		return present[0];
	}

	return new CompositeLocalMcpServer(present, logger);
}

export class CompositeLocalMcpServer implements LocalMcpServer {
	constructor(
		private readonly servers: LocalMcpServer[],
		private readonly logger: Logger,
	) {}

	getAvailableTools(): McpTool[] {
		return this.dedupe(this.servers.map((server) => server.getAvailableTools()));
	}

	getToolsByCategory(category: string): McpTool[] {
		return this.dedupe(this.servers.map((server) => server.getToolsByCategory(category)));
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const owner = this.servers.find((server) =>
			server.getAvailableTools().some((tool) => tool.name === req.name),
		);
		if (!owner) {
			return {
				content: [{ type: 'text', text: `Unknown tool: ${req.name}` }],
				isError: true,
			};
		}

		return await owner.callTool(req);
	}

	private dedupe(toolLists: McpTool[][]): McpTool[] {
		const seen = new Set<string>();
		const result: McpTool[] = [];
		for (const tools of toolLists) {
			for (const tool of tools) {
				if (seen.has(tool.name)) {
					this.logger.warn('Skipping duplicate local MCP tool name', { tool: tool.name });
					continue;
				}

				seen.add(tool.name);
				result.push(tool);
			}
		}

		return result;
	}
}
