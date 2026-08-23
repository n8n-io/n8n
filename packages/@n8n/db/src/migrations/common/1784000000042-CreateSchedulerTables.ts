import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSchedulerTables1784000000042 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createScheduledJobTable(context);
		await this.createScheduledTaskTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('scheduled_task');
		await dropTable('scheduled_job');
	}

	private async createScheduledJobTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable('scheduled_job')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('name')
					.varchar(255)
					.notNull.comment(
						'Human-readable job name. A well-known scheduler key for system jobs; generated for workflow trigger jobs.',
					),
				column('workflowId')
					.varchar(36)
					.comment(
						"References the workflow's published version, since only published trigger nodes get scheduled; NULL for system jobs not tied to a workflow. Unpublishing the workflow deletes its jobs.",
					),
				column('nodeId')
					.varchar(36)
					.comment(
						'Trigger node within the workflow that owns this job; NULL for non-trigger jobs.',
					),
				column('taskType')
					.varchar(128)
					.notNull.comment('Selects which registered handler runs the task.'),
				column('payload')
					.json.notNull.default("'{}'")
					.comment('Input passed to the task handler when an occurrence runs.'),
				column('kind')
					.varchar(16)
					.notNull.withEnumCheck(['cron', 'interval', 'one_off'])
					.comment('Recurrence kind; selects which of the schedule columns below apply.'),
				column('cronExpression')
					.varchar(255)
					.comment("Cron expression driving recurrence; set only when kind is 'cron'."),
				column('timezone')
					.varchar(64)
					.comment(
						'IANA timezone the cron expression is evaluated in; NULL uses the instance default.',
					),
				column('intervalSeconds').int.comment(
					"Gap between fires in seconds; set only when kind is 'interval'.",
				),
				column('fireAt')
					.timestampTimezone()
					.comment("Absolute time the job fires once; set only when kind is 'one_off'."),
				column('enabled')
					.bool.notNull.default(true)
					.comment('Whether the scheduler considers this job for firing.'),
				column('nextRunAt')
					.timestampTimezone()
					.comment(
						'Next time an occurrence is due; the scheduler sweep reads this to find work. NULL once disabled or a one-off has fired.',
					),
				column('lastFiredAt')
					.timestampTimezone()
					.comment('Last time an occurrence was materialized; used to recompute nextRunAt.'),
				column('maxAttempts')
					.int.notNull.default(1)
					.comment('Retry ceiling copied onto each occurrence this job materializes.'),
			)
			.withTimestamps.withForeignKey('workflowId', {
				tableName: 'workflow_published_version',
				columnName: 'workflowId',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}scheduled_job_workflowId`,
			})
			// Each recurrence kind requires its own schedule column to be set.
			.withCheck(
				`CHK_${tablePrefix}scheduled_job_cron_expression`,
				'"kind" <> \'cron\' OR "cronExpression" IS NOT NULL',
			)
			.withCheck(
				`CHK_${tablePrefix}scheduled_job_interval_seconds`,
				'"kind" <> \'interval\' OR "intervalSeconds" IS NOT NULL',
			)
			.withCheck(
				`CHK_${tablePrefix}scheduled_job_fire_at`,
				'"kind" <> \'one_off\' OR "fireAt" IS NOT NULL',
			);

		await createIndex(
			'scheduled_job',
			['nextRunAt'],
			false,
			undefined,
			'"enabled" = true AND "nextRunAt" IS NOT NULL',
		);

		// Index the workflowId FK so a workflow delete cascades without seq-scanning
		// scheduled_job. Also serves lookups of all jobs owned by a workflow.
		// Partial: system jobs (NULL workflowId) never use it, and a workflowId lookup implies
		// NOT NULL so the planner can still use it for the cascade.
		await createIndex(
			'scheduled_job',
			['workflowId'],
			false,
			undefined,
			'"workflowId" IS NOT NULL',
		);

		// Names are unique across all jobs: well-known keys for system jobs, generated
		// for workflow trigger jobs.
		await createIndex('scheduled_job', ['name'], true);
	}

	private async createScheduledTaskTable(context: MigrationContext) {
		const {
			schemaBuilder: { createTable, createIndex, column },
			isSqlite,
			tablePrefix,
		} = context;

		const idColumn = isSqlite
			? column('id').int.primary.autoGenerate2
			: column('id').bigint.primary.autoGenerate2;

		await createTable('scheduled_task')
			.withColumns(
				idColumn,
				column('jobId').int.notNull.comment('The scheduled_job this occurrence belongs to.'),
				column('taskType')
					.varchar(128)
					.notNull.comment(
						'What kind of work to run, copied from the job so a run is self-contained (no join to execute it). Also lets a run exist without a parent job in future.',
					),
				column('payload')
					.json.notNull.default("'{}'")
					.comment(
						"Handler input copied from the job. A snapshot, so editing the job later doesn't change runs already queued.",
					),
				column('scheduledFor')
					.timestampTimezone()
					.notNull.comment(
						'The logical fire time this occurrence represents; unique per job, so the same instant cannot be queued twice.',
					),
				column('runAt')
					.timestampTimezone()
					.notNull.comment(
						'Earliest time the executor may pick this up; starts at scheduledFor and is pushed out by retry backoff.',
					),
				column('status')
					.varchar(16)
					.notNull.default("'pending'")
					.withEnumCheck(['pending', 'running', 'succeeded', 'failed', 'missed', 'cancelled'])
					.comment(
						'Lifecycle state; drives which occurrences the claim and reaper scans consider.',
					),
				column('attempts')
					.int.notNull.default(0)
					.comment('Execution attempts started so far; compared against maxAttempts.'),
				column('maxAttempts')
					.int.notNull.default(1)
					.comment(
						'Attempt ceiling; once attempts reaches it, a failure is final rather than retried.',
					),
				column('claimedBy')
					.varchar(255)
					.comment('Id of the instance currently holding the lease; NULL when unclaimed.'),
				column('leaseExpiresAt')
					.timestampTimezone()
					.comment(
						'When the current lease expires; the reaper reclaims running occurrences past this.',
					),
				column('leaseEpoch')
					.int.notNull.default(0)
					.comment(
						"Fencing token bumped on each claim; lets a reaped worker detect it lost ownership and not overwrite the new owner's results.",
					),
				column('startedAt')
					.timestampTimezone()
					.comment('When the current attempt started running.'),
				column('finishedAt')
					.timestampTimezone()
					.comment('When the occurrence reached a terminal state; drives retention pruning.'),
				column('errorMessage').text.comment('Failure detail from the last attempt.'),
			)
			.withCreatedAt.withForeignKey('jobId', {
				tableName: 'scheduled_job',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}scheduled_task_jobId`,
			})
			.withCheck(
				`CHK_${tablePrefix}scheduled_task_running_lease`,
				'"status" <> \'running\' OR "leaseExpiresAt" IS NOT NULL',
			);

		// Layer-1 dedup: at most one occurrence per (job, scheduled time). Its
		// jobId prefix also indexes the FK for cascade deletes.
		await createIndex('scheduled_task', ['jobId', 'scheduledFor'], true);

		// Pending-claim scan: the executor pulls the next due, pending occurrences.
		await createIndex('scheduled_task', ['runAt'], false, undefined, '"status" = \'pending\'');

		// Lease-reaper scan: only running occurrences carry a live lease.
		await createIndex(
			'scheduled_task',
			['leaseExpiresAt'],
			false,
			undefined,
			'"status" = \'running\'',
		);

		// Retention pruning scan: prune by finishedAt cutoff. Keyed on finishedAt
		// alone (not status-first): finishedAt is only set on terminal rows, so the
		// partial predicate already restricts the index to prunable rows, and a
		// leading timestamp range pairs with the prune LIMIT. Leading with the
		// low-cardinality status instead forces a multi-range scan that Postgres
		// falls back to a seq scan on.
		await createIndex(
			'scheduled_task',
			['finishedAt'],
			false,
			undefined,
			'"finishedAt" IS NOT NULL',
		);
	}
}
