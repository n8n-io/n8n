import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'breaking-changes' })
export class BreakingChangesModule implements ModuleInterface {
	async init() {
		await import('./breaking-changes.controller');
	}
}
