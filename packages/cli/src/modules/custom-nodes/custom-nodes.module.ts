import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'custom-nodes', instanceTypes: ['main', 'worker', 'webhook'] })
export class CustomNodesModule implements ModuleInterface {
	async init() {
		await import('./custom-nodes.controller.js');

		// The loader is registered with an empty set. This serves the stored definitions.
		const { CustomNodesRegistry } = await import('./custom-nodes.registry.js');
		await Container.get(CustomNodesRegistry).refresh({
			notifyEditors: false,
			notifyInstances: false,
		});
	}

	async entities() {
		const { CustomNodeEntity } = await import('./database/entities/custom-node.entity.js');
		const { CustomActionEntity } = await import('./database/entities/custom-action.entity.js');
		const { CustomActionVersionEntity } = await import(
			'./database/entities/custom-action-version.entity.js'
		);
		const { CustomActionRevisionEntity } = await import(
			'./database/entities/custom-action-revision.entity.js'
		);

		return [
			CustomNodeEntity,
			CustomActionEntity,
			CustomActionVersionEntity,
			CustomActionRevisionEntity,
		];
	}

	async nodeLoaders() {
		const { CustomNodesNodeLoader } = await import('./custom-nodes-node-loader.js');
		return [new CustomNodesNodeLoader(Container.get(Logger))];
	}

	async settings() {
		return {};
	}
}
