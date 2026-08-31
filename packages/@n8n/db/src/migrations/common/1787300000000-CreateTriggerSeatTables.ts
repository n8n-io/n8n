import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateTriggerSeatTables1787300000000 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createWorkflowTriggerSeatTable(context);
		await this.createTriggerRunnerTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('trigger_runner');
		await dropTable('workflow_trigger_seat');
	}

	private async createWorkflowTriggerSeatTable(context: MigrationContext) {
		const {
			schemaBuilder: { createTable, createIndex, column },
			isSqlite,
		} = context;

		const idColumn = isSqlite
			? column('id').int.primary.autoGenerate2
			: column('id').bigint.primary.autoGenerate2;

		await createTable('workflow_trigger_seat').withColumns(
			idColumn,
			column('workflowId').varchar(36).notNull,
			column('nodeId').varchar(36).notNull,
			column('seatIndex').int.notNull.comment(
				'Which of the trigger node’s N replica slots this row is.',
			),
			column('desiredState')
				.varchar(16)
				.notNull.default("'active'")
				.withEnumCheck(['active', 'inactive'])
				.comment(
					'Whether a runner should serve this seat; publication flips it instead of deleting rows so holders tear down cleanly.',
				),
			column('desiredVersionId')
				.varchar(36)
				.notNull.comment('The published version the seat’s trigger should run.'),
			column('holderId')
				.varchar(255)
				.comment('Runner currently holding the lease; NULL when vacant.'),
			column('leaseExpiresAt')
				.timestampTimezone()
				.comment('When the current lease may be reclaimed by another runner.'),
			column('leaseEpoch')
				.int.notNull.default(0)
				.comment(
					'Fencing token bumped on every claim; execution inserts are guarded on it so a stale holder’s emissions never land.',
				),
			column('desiredHolderId')
				.varchar(255)
				.comment('Handoff request: an underloaded runner asking the holder to release.'),
			column('actualState')
				.varchar(16)
				.withEnumCheck(['registered', 'closed', 'error'])
				.comment('What the holder last reported doing with the seat.'),
			column('actualVersionId')
				.varchar(36)
				.comment('The version the holder’s registered trigger is actually running.'),
			column('lastError').text,
		).withTimestamps;

		await createIndex('workflow_trigger_seat', ['workflowId', 'nodeId', 'seatIndex'], true);
		await createIndex('workflow_trigger_seat', ['desiredState']);
	}

	private async createTriggerRunnerTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('trigger_runner').withColumns(
			column('runnerId').varchar(255).primary,
			column('lastHeartbeatAt')
				.timestampTimezone()
				.notNull.comment('Upserted every reconcile tick; older than TTL means the runner is gone.'),
		).withTimestamps;
	}
}
