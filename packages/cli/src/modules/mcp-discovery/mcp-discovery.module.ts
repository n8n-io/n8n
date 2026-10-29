// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { GlobalConfig } from '@n8n/config';
import { BackendModule } from '@n8n/decorators';
import type { ModuleInterface } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'mcp-discovery' })
export class McpDiscoveryModule implements ModuleInterface {
	async init() {
		if (Container.get(GlobalConfig).deployment.type !== 'cloud') return;
		const { McpDiscoveryActivityEvents } = await import('./activity-events.service.js');
		Container.get(McpDiscoveryActivityEvents).init();
		await import('./mcp-discovery.controller.js');
	}
}
// EOF Experiment cleanup
