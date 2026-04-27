import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSettingsToWorkflowHistory1777300000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_history', [column('settings').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_history', ['settings']);
	}
}
