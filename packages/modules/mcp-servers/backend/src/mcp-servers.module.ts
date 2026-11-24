import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Custom MCP servers: a builder puts workflows of a project on a server, and people of the
 * project connect AI clients to it. The module is on by default. The PostHog flag
 * `155_custom_mcp_servers` decides who sees it, and `N8N_DISABLED_MODULES=mcp-servers` turns it off.
 */
@BackendModule({ name: 'mcp-servers', instanceTypes: ['main'] })
export class McpServersModule implements ModuleInterface {
	async entities() {
		const { McpServer } = await import('./database/entities/mcp-server.entity.js');
		const { McpServerTool } = await import('./database/entities/mcp-server-tool.entity.js');
		const { McpServerConnection } = await import(
			'./database/entities/mcp-server-connection.entity.js'
		);
		const { McpServerBlock } = await import('./database/entities/mcp-server-block.entity.js');
		return [McpServer, McpServerTool, McpServerConnection, McpServerBlock];
	}
}
