import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'query', instanceTypes: ['main'] })
export class QueryModule implements ModuleInterface {
	async init() {
		await import('./query.controller');
	}
}
