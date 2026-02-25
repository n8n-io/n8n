import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'breaking-changes', instanceTypes: ['main'] })
export class BreakingChangesModule implements ModuleInterface {
	async init() {
		if (!MIGRATION_REPORT_TARGET_VERSION) return;

		const { loadAllRules } = await import('./rules');
		await loadAllRules();
		await import('./breaking-changes.controller');
	}
}
