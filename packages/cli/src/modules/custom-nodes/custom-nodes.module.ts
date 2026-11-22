import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'custom-nodes', instanceTypes: ['main', 'worker', 'webhook'] })
export class CustomNodesModule implements ModuleInterface {
	async init() {}

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
		return [];
	}

	async settings() {
		return {};
	}
}
