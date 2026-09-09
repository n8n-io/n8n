import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'instance_ai_run_snapshots';

/**
 * The agent-tree snapshot store is retired: history and the SSE bootstrap
 * derive their trees by folding `instance_ai_events`, so the persisted tree is
 * no longer read or written. The LangSmith feedback anchor that used to live
 * here rides on the durable log's `run-start` fact from this release on; runs
 * recorded before that resolve no anchor, so feedback on those turns is still
 * stored but no longer annotates the LangSmith trace — accepted, to keep this
 * a plain drop.
 *
 * The `down` recreates the table at its final schema (base columns plus the
 * trace/LangSmith ids added by later migrations) so a rollback restores a
 * structurally-identical table — the historical rows are not recoverable.
 */
export class DropInstanceAiRunSnapshotsTable1788336311704 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropTable(table);
	}

	async down({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('threadId').uuid.primary.notNull,
				column('runId').varchar(36).primary.notNull,
				column('messageGroupId').varchar(36),
				column('runIds').json,
				column('tree').text.notNull,
				column('traceId').varchar(64),
				column('spanId').varchar(64),
				column('langsmithRunId').varchar(36),
				column('langsmithTraceId').varchar(36),
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
