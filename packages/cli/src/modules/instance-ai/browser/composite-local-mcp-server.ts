import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import type { LocalMcpServer } from '@n8n/instance-ai';

export function composeLocalMcpServers(
	...servers: Array<LocalMcpServer | undefined>
): LocalMcpServer | undefined {
	const present = servers.filter((server): server is LocalMcpServer => server !== undefined);
	if (present.length === 0) {
		return undefined;
	}

	if (present.length === 1) {
		return present[0];
	}

	return new CompositeLocalMcpServer(present);
}

type CompositeLocalMcpServerToolMap = Map<string, { server: LocalMcpServer; tool: McpTool }>;

export class CompositeLocalMcpServer implements LocalMcpServer {
	private availableTools: CompositeLocalMcpServerToolMap;
	private availableToolsByCategory: Map<string, CompositeLocalMcpServerToolMap> = new Map();

	constructor(private readonly servers: LocalMcpServer[]) {
		this.availableTools = this.dedupe((server) => server.getAvailableTools());
	}

	getAvailableTools(): McpTool[] {
		return this.unwrapTools(this.availableTools);
	}

	getToolsByCategory(category: string): McpTool[] {
		if (!this.availableToolsByCategory.has(category)) {
			this.availableToolsByCategory.set(
				category,
				this.dedupe((server) => server.getToolsByCategory(category)),
			);
		}
		return this.unwrapTools(this.availableToolsByCategory.get(category)!);
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const serverTool = this.availableTools.get(req.name);
		if (!serverTool) {
			return {
				content: [{ type: 'text', text: `Unknown tool: ${req.name}` }],
				isError: true,
			};
		}

		return await serverTool.server.callTool(req);
	}

	private unwrapTools(tools: CompositeLocalMcpServerToolMap) {
		return Array.from(tools.values()).map(({ tool }) => tool);
	}

	private dedupe(getter: (server: LocalMcpServer) => McpTool[]) {
		const toolsMap: CompositeLocalMcpServerToolMap = new Map();
		for (const server of this.servers) {
			for (const tool of getter(server)) {
				toolsMap.set(tool.name, {
					server,
					tool,
				});
			}
		}

		return toolsMap;
	}
}
