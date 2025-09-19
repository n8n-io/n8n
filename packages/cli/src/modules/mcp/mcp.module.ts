import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'mcp' })
export class McpModule implements ModuleInterface {
	async init() {
		await import('./mcp.controller');
		await import('./mcp.settings.controller');
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be `{ mcp: { mcpAccessEnabled: boolean } }`.
	 */
	async settings() {
		const { McpSettingsService } = await import('./mcp.settings.service');
		const mcpAccessEnabled = await Container.get(McpSettingsService).getEnabled();
		return { mcpAccessEnabled };
	}

	@OnShutdown()
	async shutdown() {}
}
