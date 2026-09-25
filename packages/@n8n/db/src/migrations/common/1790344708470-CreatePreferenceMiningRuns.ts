import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreatePreferenceMiningRuns1790344708470 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('preference_mining_run')
			.withColumns(
				column('id').uuid.primary,
				column('userId').uuid.notNull.comment('User who started the run'),
				column('projectId').varchar(36).notNull.comment('Project inspected by the run'),
				column('summary').json.notNull.comment('Run metadata for history lists'),
				column('data').json.notNull.comment('Run settings, results, evidence, and measurements'),
			)
			.withTimestamps.withIndexOn(['userId', 'projectId', 'createdAt', 'id'])
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' });
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('preference_mining_run');
	}
}
