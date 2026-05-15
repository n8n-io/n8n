import type { MigrationContext, ReversibleMigration } from '../migration-types';

const checkpointTable = 'instance_ai_checkpoints';
const runSnapshotsTable = 'instance_ai_run_snapshots';

export class CreateInstanceAiCheckpointTable1778050000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, addColumns, column } }: MigrationContext) {
		await addColumns(runSnapshotsTable, [
			column('traceId').varchar(64).comment('OpenTelemetry trace ID for the root Instance AI run.'),
			column('spanId').varchar(64).comment('OpenTelemetry span ID for the root Instance AI run.'),
		]);

		await createTable(checkpointTable)
			.withColumns(
				column('key').varchar(255).primary.notNull,
				column('runId').varchar(255),
				column('threadId').uuid.notNull,
				column('resourceId').varchar(255),
				column('state').text.notNull,
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
		await dropColumns(runSnapshotsTable, ['traceId', 'spanId']);
	}
}
