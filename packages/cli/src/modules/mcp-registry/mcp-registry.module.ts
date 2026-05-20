import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

@BackendModule({ name: 'mcp-registry' })
export class McpRegistryModule implements ModuleInterface {
	async init() {
		const { McpRegistryService } = await import('./registry/mcp-registry.service');
		await Container.get(McpRegistryService).init();

		if (process.env.E2E_TESTS === 'true' && process.env.NODE_ENV !== 'production') {
			await import('./mcp-registry-test.controller');
		}
	}

	async entities() {
		const { McpRegistryServerEntity } = await import('./registry/mcp-registry-server.entity');
		return [McpRegistryServerEntity];
	}

	async nodeLoaders() {
		const { McpRegistryNodeLoader } = await import('./mcp-registry-node-loader');

		return [
			new McpRegistryNodeLoader(Container.get(LoadNodesAndCredentials), Container.get(Logger)),
		];
	}
}
