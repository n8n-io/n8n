import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'execution_ledger';

/**
 * One row for each start and end of a run. A fold step reads the rows in id
 * order and deletes them, so the table only holds the last few seconds of events.
 */
export class CreateExecutionLedgerTable1793280161358 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column },
		escape,
		isSqlite,
		isPostgres,
		tablePrefix,
		runQuery,
	}: MigrationContext) {
		const event = escape.columnName('event');
		const outcome = escape.columnName('outcome');
		const blockedBy = escape.columnName('blockedBy');

		// SQLite needs AUTOINCREMENT to prevent ID reuse after the fold deletes rows.
		const id = isSqlite
			? column('id').int.primary.autoGenerate
			: column('id').bigint.primary.autoGenerate2;

		await createTable(tableName)
			.withColumns(
				id.comment('Fold order; IDs are not reused'),
				column('executionId')
					.varchar(36)
					.notNull.comment('Execution ID, or the agent message ID for agent rows'),
				column('occurredAt').timestampTimezone().notNull.comment('When the run started or ended'),
				column('entityType')
					.varchar(16)
					.notNull.withEnumCheck(['workflow', 'agent'])
					.comment('workflow: a workflow run; agent: an agent message'),
				column('entityName')
					.varchar(128)
					.notNull.comment('Name of the workflow or agent at the time of the event'),
				column('entityId')
					.varchar(36)
					.notNull.comment('Workflow ID or agent ID. No foreign key: rows outlive the entity'),
				column('projectId')
					.varchar(36)
					.notNull.comment(
						'Project at the time of the event. No foreign key: rows outlive the project',
					),
				column('mode')
					.varchar(32)
					.notNull.comment('Raw execution mode, such as trigger or webhook. Not constrained'),
				column('source')
					.varchar(32)
					.notNull.default("'none'")
					.comment('Raw execution source, such as instance_ai. none when unset. Not constrained'),
				column('event')
					.varchar(16)
					.notNull.withEnumCheck(['started', 'ended'])
					.comment('started: the run got its execution row; ended: the run stopped'),
				column('outcome')
					.varchar(16)
					.notNull.withEnumCheck(['none', 'success', 'error', 'crashed', 'canceled', 'blocked'])
					.comment('none for started rows. blocked: the run stopped before its first node'),
				column('blockedBy')
					.varchar(32)
					.notNull.default("'none'")
					.withEnumCheck([
						'none',
						'policy',
						'credentialAccess',
						'invalidWorkflow',
						'contextHook',
						'startFailed',
					])
					.comment(
						'Why a blocked run stopped. startFailed: any other failure before the first node',
					),
				column('runtimeMs')
					.int.notNull.default(0)
					.comment('Run time in milliseconds. 0 for started rows'),
				column('timeSavedMin')
					.int.notNull.default(0)
					.comment('Time saved in minutes. 0 for started rows'),
				column('origin')
					.varchar(8)
					.notNull.withEnumCheck(['v1', 'v2'])
					.comment('v1: written by this instance; v2: pulled from the engine v2 data plane'),
				column('eventId').uuid.notNull.comment(
					'UUIDv7 set by the writer. The engine v2 pull deduplicates on it',
				),
			)
			.withCheck(
				`CHK_${tablePrefix}${tableName}_started_outcome`,
				`(${event} = 'started' AND ${outcome} = 'none') OR (${event} = 'ended' AND ${outcome} <> 'none')`,
			)
			.withCheck(
				`CHK_${tablePrefix}${tableName}_blocked_reason`,
				`(${outcome} = 'blocked' AND ${blockedBy} <> 'none') OR (${outcome} <> 'blocked' AND ${blockedBy} = 'none')`,
			);

		if (isPostgres) {
			// Same tuning as workflow_statistics_delta: rows are deleted every few seconds.
			await runQuery(
				`ALTER TABLE ${escape.tableName(tableName)} SET (autovacuum_vacuum_scale_factor = 0.0, autovacuum_vacuum_threshold = 1000, autovacuum_vacuum_cost_delay = 0)`,
			);
		}
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
