import type { MigrationContext, ReversibleMigration } from '../migration-types';

const checkpointTable = 'instance_ai_checkpoints';
const runSnapshotsTable = 'instance_ai_run_snapshots';

export class CreateInstanceAiCheckpointTable1784000000007 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, addColumns, column } }: MigrationContext) {
		await addColumns(
			runSnapshotsTable,
			[
				column('traceId')
					.varchar(64)
					.comment('OpenTelemetry trace ID for the root Instance AI run.'),
				column('spanId').varchar(64).comment('OpenTelemetry span ID for the root Instance AI run.'),
			],
			{ ackThisRecreatesOnSqlite: true },
		);

		await createTable(checkpointTable)
			.withColumns(
				column('key')
					.varchar(255)
					.primary.notNull.comment('Opaque checkpoint key from the agent runtime.'),
				column('runId')
					.varchar(255)
					.comment('Run ID parsed from the checkpoint key when available.'),
				column('threadId').uuid.notNull.comment('Instance AI thread that owns the checkpoint.'),
				column('resourceId').varchar(255).comment('Resource ID recorded by the agent runtime.'),
				column('state').json.notNull.comment('Serializable agent state snapshot stored as JSON.'),
			)
			.withIndexOn('runId')
			.withIndexOn('threadId')
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('resourceId').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable, dropColumns } }: MigrationContext) {
		await dropTable(checkpointTable);
		await dropColumns(runSnapshotsTable, ['traceId', 'spanId'], { ackThisRecreatesOnSqlite: true });
	}
}
