import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

/**
 * Custom Nodes & Custom Operations mockup. Everything is inert unless
 * `N8N_CUSTOM_NODES_MOCKUP=true`: no routes, no node types, and the frontend
 * hides all entry points.
 */
@BackendModule({ name: 'custom-nodes', instanceTypes: ['main'] })
export class CustomNodesModule implements ModuleInterface {
	async init() {
		if (!(await this.isEnabled())) return;

		await import('./custom-nodes.controller.js');

		const { CustomNodesService } = await import('./custom-nodes.service.js');
		await Container.get(CustomNodesService).init();
	}

	async entities() {
		const { CustomNodeDefinitionEntity } = await import(
			'./database/custom-node-definition.entity.js'
		);
		return [CustomNodeDefinitionEntity];
	}

	async settings() {
		return { enabled: await this.isEnabled() };
	}

	async nodeLoaders() {
		if (!(await this.isEnabled())) return [];

		const { CustomNodesNodeLoader } = await import('./custom-nodes-node-loader.js');
		return [
			new CustomNodesNodeLoader(Container.get(LoadNodesAndCredentials), Container.get(Logger)),
		];
	}

	private async isEnabled() {
		const { CustomNodesConfig } = await import('./custom-nodes.config.js');
		return Container.get(CustomNodesConfig).enabled;
	}
}
