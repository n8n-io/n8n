import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * LIGO-819 POC: three-way git reconciliation for tracked branches.
 * Not a default module — enable with `N8N_ENABLED_MODULES=branch-sync`.
 */
@BackendModule({
	name: 'branch-sync',
})
export class BranchSyncModule implements ModuleInterface {
	async init() {
		await import('./branch-sync.controller.js');
	}
}
