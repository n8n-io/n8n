import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	threads: 'instance_ai_threads',
	runSnapshots: 'instance_ai_run_snapshots',
	iterationLogs: 'instance_ai_iteration_logs',
} as const;

export class CreateInstanceAiSnapshotAndLogTables1774000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.runSnapshots)
			.withColumns(
				column('threadId').varchar().primary.notNull,
				column('runId').varchar().primary.notNull,
				column('messageGroupId').varchar(),
				column('runIds').json,
				column('tree').text.notNull,
			)
			.withIndexOn(['threadId', 'messageGroupId'])
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: table.threads,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(table.iterationLogs)
			.withColumns(
				column('id').varchar().primary.notNull,
				column('threadId').varchar().notNull,
				column('taskKey').varchar().notNull,
				column('entry').text.notNull,
			)
			.withIndexOn(['threadId', 'taskKey', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: table.threads,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.iterationLogs);
		await dropTable(table.runSnapshots);
	}
}
