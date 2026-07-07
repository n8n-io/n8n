import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_run_snapshots';

/**
 * The agent-tree snapshot store is retired: history and SSE bootstrap derive
 * their trees by folding `instance_ai_events`, so the persisted tree is no
 * longer read or written. The LangSmith feedback anchor that used to live here
 * now rides on the durable log's `run-start` fact.
 *
 * The `down` recreates the table at its final schema (base columns plus the
 * trace/LangSmith ids added by later migrations) so a rollback restores a
 * structurally-identical table — the historical rows are not recoverable.
 */
export class DropInstanceAiRunSnapshotsTable1784000000045 implements ReversibleMigration {
	async up({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}

	async down({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('threadId').uuid.primary.notNull,
				column('runId').varchar(36).primary.notNull,
				column('messageGroupId').varchar(36),
				column('runIds').json,
				column('tree').text.notNull,
				column('traceId').varchar(),
				column('spanId').varchar(),
				column('langsmithRunId').varchar(),
				column('langsmithTraceId').varchar(),
			)
			.withIndexOn(['threadId', 'messageGroupId'])
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}
}
