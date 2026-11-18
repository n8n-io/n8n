import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * MCP Servers: many user-built MCP servers on one instance, each at
 * `/mcp-servers/<slug>`. Not the instance MCP server and not the MCP Server Trigger node.
 */
@BackendModule({ name: 'mcp-servers', instanceTypes: ['main'] })
export class McpServersModule implements ModuleInterface {
	async init() {
		await import('./mcp-servers.controller.js');
		await import('./mcp-server-runtime.controller.js');

		const { ProtectedResourceRegistry } = await import('@n8n/backend-services/auth');
		const { McpServerProtectedResource } = await import('./mcp-server-protected-resource.js');
		Container.get(ProtectedResourceRegistry).registerResolver(
			Container.get(McpServerProtectedResource),
		);
	}

	async entities() {
		const { MCP_SERVER_ENTITIES } = await import('./database/mcp-server.entities.js');
		return MCP_SERVER_ENTITIES;
	}

	async settings() {
		return { enabled: true };
	}
}
