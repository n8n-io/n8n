import { BackendModule, type ModuleInterface } from '@n8n/decorators';

@BackendModule({ name: 'n8n-lite', instanceTypes: ['main'] })
export class N8nLiteModule implements ModuleInterface {
	async init() {
		await import('./n8n-lite.controller.js');
	}
}
