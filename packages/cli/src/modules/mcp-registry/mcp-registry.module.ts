import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

@BackendModule({ name: 'mcp-registry' })
export class McpRegistryModule implements ModuleInterface {
	async nodeLoaders() {
		const { McpRegistryService } = await import('./registry/mcp-registry.service');
		const { McpRegistryNodeLoader } = await import('./mcp-registry-node-loader');

		return [
			new McpRegistryNodeLoader(
				Container.get(McpRegistryService),
				Container.get(LoadNodesAndCredentials),
				Container.get(Logger),
			),
		];
	}
}
