import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'preference-mining', instanceTypes: ['main'] })
export class PreferenceMiningModule implements ModuleInterface {
	async init() {
		await import('./preference-mining.controller.js');
	}
}
