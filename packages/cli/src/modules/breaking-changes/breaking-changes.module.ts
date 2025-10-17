import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

@BackendModule({ name: 'breaking-changes' })
export class BreakingChangesModule implements ModuleInterface {
	async init() {
		await import('./breaking-changes.controller');
	}

	@OnShutdown()
	async shutdown() {}
}
