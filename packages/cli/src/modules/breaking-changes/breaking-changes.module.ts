import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'breaking-changes', instanceTypes: ['main'] })
export class BreakingChangesModule implements ModuleInterface {
	async init() {
		if (!MIGRATION_REPORT_TARGET_VERSION) return;

		// Import rules so that they are added to the BreakingChangeRuleMetadata registry
		await import('./rules/index.js');

		// Register rules in the service
		const { BreakingChangeService } = await import('./breaking-changes.service.js');
		Container.get(BreakingChangeService).registerRules();

		// Register the node migrations keyed by rule id
		const { MigrationRegistry } = await import('./breaking-changes.migration-registry.service.js');
		Container.get(MigrationRegistry).registerAll();

		await import('./breaking-changes.controller.js');
	}

	// Registered even when `init()` skips: the tables exist regardless of the
	// target version, and TypeORM needs the entities to map them.
	async entities() {
		const { MigrationFinding } = await import('./database/entities/migration-finding.entity.js');
		const { MigrationFindingSync } = await import(
			'./database/entities/migration-finding-sync.entity.js'
		);

		return [MigrationFinding, MigrationFindingSync];
	}
}
