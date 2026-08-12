import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateInstanceVersionHistoryTable1774854660000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('instance_version_history').withColumns(
			column('id').int.primary.autoGenerate,
			column('major').int.notNull,
			column('minor').int.notNull,
			column('patch').int.notNull,
		).withCreatedAt;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('instance_version_history');
	}
}
