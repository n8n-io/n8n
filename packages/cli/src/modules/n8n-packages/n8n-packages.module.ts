import { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'n8n-packages',
})
export class N8nPackagesModule implements ModuleInterface {
	async init() {
		await import('./n8n-packages.service.js');

		// The package tools are for MCP clients only. The mcp module runs on main instances only and
		// initialises before this module, so without it the heavy tool code is not loaded.
		if (Container.get(ModuleRegistry).isActive('mcp')) {
			const { registerN8nPackagesCapabilities } = await import(
				'./capabilities/n8n-packages-capabilities.js'
			);
			registerN8nPackagesCapabilities();
		}
	}
}
