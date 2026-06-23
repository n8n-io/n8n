import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateDistributedScheduleTables1784000000032 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex } }: MigrationContext) {
		await createTable('scheduled_job')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowId')
					.varchar(36)
					.notNull.comment('Workflow whose active Schedule Trigger rule owns this schedule'),
				column('nodeId')
					.varchar(64)
					.notNull.comment('Schedule Trigger node ID within the active workflow version'),
				column('ruleIndex').int.notNull.comment(
					'Index of the trigger rule within the Schedule Trigger node',
				),
				column('cronExpression')
					.varchar(255)
					.notNull.comment('Six-field cron expression evaluated using timezone'),
				column('timezone')
					.varchar(64)
					.notNull.comment('IANA timezone used for schedule evaluation'),
				column('recurrence').json.comment(
					'Optional recurrence filter for interval rules cron cannot express exactly',
				),
				column('recurrenceLastValue').int.comment(
					'Last accepted recurrence bucket, e.g. hour, day-of-year, week, or month',
				),
				column('enabled').bool.notNull.default(false),
				column('nextRunAt')
					.timestampTimezone(3)
					.comment('Next canonical occurrence time to materialize'),
				column('lastFiredAt')
					.timestampTimezone(3)
					.comment('Most recent materialized occurrence time'),
			)
			.withIndexOn(['workflowId', 'nodeId'])
			.withIndexOn(['enabled', 'nextRunAt'])
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex('scheduled_job', ['workflowId', 'nodeId', 'ruleIndex'], /* isUnique= */ true);

		await createTable('scheduled_task')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('jobId').int.notNull.comment('Scheduled job that materialized this occurrence'),
				column('workflowId')
					.varchar(36)
					.notNull.comment('Denormalized workflow ID for execution handoff and cleanup'),
				column('nodeId')
					.varchar(64)
					.notNull.comment('Denormalized Schedule Trigger node ID for execution handoff'),
				column('scheduledFor')
					.timestampTimezone(3)
					.notNull.comment('Canonical occurrence instant in UTC'),
				column('runAt')
					.timestampTimezone(3)
					.notNull.comment('Time after which executors may claim the task'),
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(['pending', 'running', 'succeeded', 'failed', 'cancelled']),
				column('attempts').int.notNull.default(0),
				column('maxAttempts').int.notNull.default(1),
				column('claimedBy')
					.varchar(64)
					.comment('Host ID of the main instance that claimed the task'),
				column('leaseExpiresAt')
					.timestampTimezone(3)
					.comment('When a running claim may be retried'),
				column('executionId').varchar(36).comment('Execution ID created during successful handoff'),
				column('startedAt').timestampTimezone(3),
				column('finishedAt').timestampTimezone(3),
				column('errorMessage').text,
			)
			.withIndexOn(['jobId'])
			.withIndexOn(['workflowId', 'nodeId'])
			.withIndexOn(['status', 'runAt'])
			.withIndexOn(['status', 'leaseExpiresAt'])
			.withForeignKey('jobId', {
				tableName: 'scheduled_job',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createIndex('scheduled_task', ['jobId', 'scheduledFor'], /* isUnique= */ true);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('scheduled_task');
		await dropTable('scheduled_job');
	}
}
