import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

/**
 * Custom Nodes & Custom Actions mockup. Always on for this branch, so that
 * checking it out is all that is needed to try it.
 */
@BackendModule({ name: 'custom-nodes', instanceTypes: ['main'] })
export class CustomNodesModule implements ModuleInterface {
	async init() {
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
		return { enabled: true };
	}

	async nodeLoaders() {
		const { CustomNodesNodeLoader } = await import('./custom-nodes-node-loader.js');
		return [
			new CustomNodesNodeLoader(Container.get(LoadNodesAndCredentials), Container.get(Logger)),
		];
	}
}
