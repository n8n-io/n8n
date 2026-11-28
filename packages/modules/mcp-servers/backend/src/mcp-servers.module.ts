import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Custom MCP servers: a builder puts workflows of a project on a server, and people of the
 * project connect AI clients to it. The module is on by default. The PostHog flag
 * `155_custom_mcp_servers` decides who sees it, and `N8N_DISABLED_MODULES=mcp-servers` turns it off.
 */
@BackendModule({ name: 'mcp-servers', instanceTypes: ['main'] })
export class McpServersModule implements ModuleInterface {
	async init() {
		const { McpServerAdapters } = await import('./ports/mcp-server-adapters.js');
		const { WorkflowToolPort } = await import('./ports/workflow-tool.port.js');
		const { TextDraftPort } = await import('./ports/text-draft.port.js');
		const { OAuthClientNamePort } = await import('./ports/oauth-client-name.port.js');
		const { RefreshTokenPort } = await import('./ports/refresh-token.port.js');
		const adapters = Container.get(McpServerAdapters).resolve();
		Container.set(WorkflowToolPort, adapters.workflows);
		Container.set(TextDraftPort, adapters.textDrafts);
		Container.set(OAuthClientNamePort, adapters.clients);
		Container.set(RefreshTokenPort, adapters.refreshTokens);
		await import('./controllers/mcp-servers.controller.js');
		await import('./controllers/mcp-servers-list.controller.js');
		await import('./controllers/mcp-server-tools.controller.js');
		await import('./controllers/mcp-server-share.controller.js');
		await import('./controllers/mcp-server-access.controller.js');
		await import('./controllers/mcp-server-runtime.controller.js');
		const { ProtectedResourceRegistry } = await import('@n8n/backend-services/auth');
		const { McpServerProtectedResource } = await import(
			'./services/mcp-server-protected-resource.service.js'
		);
		Container.get(ProtectedResourceRegistry).registerResolver(
			Container.get(McpServerProtectedResource),
		);
	}

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
