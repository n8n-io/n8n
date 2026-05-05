import {
	McpClient,
	type BuiltTool,
	type McpServerConfig as NativeMcpServerConfig,
} from '@n8n/agents';

import type { McpServerConfig } from '../types';

export class McpClientManager {
	private mcpClient: McpClient | undefined;

	async connect(servers: McpServerConfig[]): Promise<BuiltTool[]> {
		if (servers.length === 0) return [];

		const configs: NativeMcpServerConfig[] = [];

		for (const server of servers) {
			const config: NativeMcpServerConfig = { name: server.name };
			if (server.url) {
				config.url = server.url;
			} else if (server.command) {
				config.command = server.command;
				if (server.args !== undefined) config.args = server.args;
				if (server.env !== undefined) config.env = server.env;
			}
			configs.push(config);
		}

		this.mcpClient = new McpClient(configs);
		return await this.mcpClient.listTools();
	}

	async disconnect(): Promise<void> {
		if (this.mcpClient) {
			await this.mcpClient.close();
			this.mcpClient = undefined;
		}
	}
}
