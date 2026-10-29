import type { MigrationContext, ReversibleMigration } from '../migration-types';

const iterationLogs = 'instance_ai_iteration_logs';

/** Instance AI no longer reads or writes its iteration log. */
export class DropInstanceAiIterationLogs1793117284364 implements ReversibleMigration {
	async up({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(iterationLogs);
	}

	async down({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(iterationLogs)
			.withColumns(
				column('id').varchar(36).primary,
				column('threadId').uuid.notNull,
				column('taskKey').varchar().notNull,
				column('entry').text.notNull,
			)
			.withIndexOn(['threadId', 'taskKey', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}
}
