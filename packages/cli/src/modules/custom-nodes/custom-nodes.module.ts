import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'custom-nodes', instanceTypes: ['main', 'worker', 'webhook'] })
export class CustomNodesModule implements ModuleInterface {
	async init() {}

	async entities() {
		return [];
	}

	async nodeLoaders() {
		return [];
	}

	async settings() {
		return {};
	}
}
