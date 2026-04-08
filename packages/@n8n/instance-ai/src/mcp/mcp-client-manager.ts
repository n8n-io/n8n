import { MCPClient } from '@mastra/mcp';

import type { McpServerConfig } from '../types';

export class McpClientManager {
	private mcpClient: MCPClient | undefined;

	async connect(servers: McpServerConfig[]): Promise<Record<string, unknown>> {
		if (servers.length === 0) return {};

		const serverMap: Record<
			string,
			{ url: URL } | { command: string; args?: string[]; env?: Record<string, string> }
		> = {};

		for (const server of servers) {
			if (server.url) {
				serverMap[server.name] = { url: new URL(server.url) };
			} else if (server.command) {
				serverMap[server.name] = {
					command: server.command,
					args: server.args,
					env: server.env,
				};
			}
		}

		this.mcpClient = new MCPClient({ servers: serverMap });
		return await this.mcpClient.listTools();
	}

	async disconnect(): Promise<void> {
		if (this.mcpClient) {
			await this.mcpClient.disconnect();
			this.mcpClient = undefined;
		}
	}
}
