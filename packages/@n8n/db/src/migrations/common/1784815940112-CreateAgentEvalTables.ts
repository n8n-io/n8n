import type { MigrationContext, ReversibleMigration } from '../migration-types';

const DATASET_TABLE = 'agent_eval_dataset';
const RUN_TABLE = 'agent_eval_run';
const RESULT_TABLE = 'agent_eval_result';
const RATING_TABLE = 'agent_eval_rating';
const AGENTS_TABLE = 'agents';
const USER_TABLE = 'user';

const RUN_STATUSES = ['new', 'running', 'completed', 'error', 'cancelled'];
const RESULT_STATUSES = ['new', 'running', 'success', 'error', 'cancelled'];

/**
 * Persistence layer for agent evals: a dataset points (via `datasetSource` +
 * `datasetRef`) at an existing Data Table / sheet, a run executes it against an
 * agent version, a result captures per-case output, and a rating records human
 * feedback. `agentVersionId` is a loose pointer (no FK) so runs survive history
 * pruning, mirroring `TestRun.workflowVersionId`.
 */
export class CreateAgentEvalTables1784815940112 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(DATASET_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').text,
				column('agentId').varchar(36).notNull,
				column('datasetSource')
					.varchar(32)
					.notNull.withEnumCheck(['data_table', 'google_sheets'])
					.comment('Dataset backend the cases are read from'),
				column('datasetRef').json.notNull.comment(
					'Pointer into the dataset backend (e.g. { dataTableId }); shape varies by datasetSource',
				),
				column('columnMapping').json.comment(
					'Maps dataset columns onto input / expectedOutput / criteria roles',
				),
				column('createdById').uuid,
			)
			.withIndexOn('agentId')
			.withForeignKey('agentId', {
				tableName: AGENTS_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await createTable(RUN_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('datasetId').varchar(36).notNull,
				column('agentVersionId')
					.varchar(36)
					.comment(
						'Published agent version under test (agent_history.versionId); loose pointer, no FK so runs survive history pruning. The agent itself comes from the dataset.',
					),
				column('status').varchar().notNull.withEnumCheck(RUN_STATUSES).comment('Run lifecycle'),
				column('runAt').timestampTimezone(),
				column('completedAt').timestampTimezone(),
				column('metrics').json.comment('Aggregated run-level scores'),
				column('errorCode').varchar(255),
				column('errorDetails').json,
				column('runningInstanceId')
					.varchar(255)
					.comment('Main instance executing this run; used to coordinate cancellation'),
				column('cancelRequested')
					.bool.default(false)
					.notNull.comment('Fallback cancellation flag polled by the running main'),
				column('createdById').uuid,
			)
			.withIndexOn('datasetId')
			.withForeignKey('datasetId', {
				tableName: DATASET_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await createTable(RESULT_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('runId').varchar(36).notNull,
				column('sourceRowId')
					.varchar(255)
					.comment('Origin dataset row id; loose pointer, rows are external and mutable'),
				column('runIndex').int.comment('Order of this case within the run'),
				column('status')
					.varchar()
					.notNull.withEnumCheck(RESULT_STATUSES)
					.comment('Per-case lifecycle'),
				column('input').json.comment(
					'Snapshot of the case input actually run (row may later change)',
				),
				column('output').json.comment('Agent output for this case'),
				column('toolCalls').json.comment('Tool-call timeline captured during the run'),
				column('metrics').json.comment('Per-case judge scores'),
				column('runAt').timestampTimezone(),
				column('completedAt').timestampTimezone(),
				column('errorCode').varchar(255),
				column('errorDetails').json,
			)
			.withIndexOn('runId')
			.withForeignKey('runId', {
				tableName: RUN_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(RATING_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('resultId').varchar(36).notNull,
				column('vote')
					.varchar(8)
					.notNull.withEnumCheck(['up', 'down'])
					.comment('Human feedback direction'),
				column('comment').text,
				column('correction').json.comment('Optional corrected/edited output supplied by the rater'),
				column('ratedById').uuid,
			)
			.withIndexOn('resultId')
			.withForeignKey('resultId', {
				tableName: RESULT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('ratedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(RATING_TABLE);
		await dropTable(RESULT_TABLE);
		await dropTable(RUN_TABLE);
		await dropTable(DATASET_TABLE);
	}
}
