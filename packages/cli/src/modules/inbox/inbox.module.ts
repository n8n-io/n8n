import { BackendModule, type ModuleInterface } from '@n8n/decorators';

@BackendModule({ name: 'inbox', instanceTypes: ['main'] })
export class InboxModule implements ModuleInterface {
	async init() {
		await import('./inbox.controller.js');
	}
}
