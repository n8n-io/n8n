import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'breaking-changes', instanceTypes: ['main'] })
export class BreakingChangesModule implements ModuleInterface {
	async init() {
		if (!MIGRATION_REPORT_TARGET_VERSION) return;

		// Import rules so that they are added to the BreakingChangeRuleMetadata registry
		await import('./rules');

		// Register rules in the service
		const { BreakingChangeService } = await import('./breaking-changes.service');
		Container.get(BreakingChangeService).registerRules();

		await import('./breaking-changes.controller');
	}
}
