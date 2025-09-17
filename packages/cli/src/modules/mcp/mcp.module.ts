import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

@BackendModule({ name: 'mcp' })
export class McpModule implements ModuleInterface {
	async init() {
		await import('./mcp.controller');
	}

	@OnShutdown()
	async shutdown() {}
}
