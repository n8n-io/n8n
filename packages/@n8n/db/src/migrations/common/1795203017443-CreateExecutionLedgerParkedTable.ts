import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'execution_ledger_parked';

const unconstrained = 'Copied from the ledger row. Not constrained, so an unknown value fits';

/**
 * Ledger rows that one fold step could not fold. The rows stay here until a replay
 * gives them to that step again. The table is empty in normal operation.
 */
export class CreateExecutionLedgerParkedTable1795203017443 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').int.primary.autoGenerate2.comment('Row key only. It has no meaning'),
				column('ledgerId').bigint.notNull.comment(
					'ID that the row had in execution_ledger. Replay order',
				),
				column('step')
					.varchar(48)
					.notNull.comment(
						'Name of the fold step that must still read the row. _unreadable: no step could read it',
					),
				column('error')
					.varchar(255)
					.notNull.comment('Message of the failure that parked the row. Truncated'),
				column('parkedAt').timestampTimezone().notNull.comment('When the fold parked the row'),
				column('executionId').varchar(36).notNull.comment('Copied from the ledger row'),
				column('occurredAt').timestampTimezone().notNull.comment('Copied from the ledger row'),
				column('entityType').varchar(16).notNull.comment(unconstrained),
				column('entityName').varchar(128).notNull.comment('Copied from the ledger row'),
				column('entityId')
					.varchar(36)
					.notNull.comment('Workflow ID or agent ID. No foreign key: rows outlive the entity'),
				column('projectId')
					.varchar(36)
					.comment(
						'Project at the time of the event. No foreign key: rows outlive the project. Null when the workflow has no owner project',
					),
				column('mode').varchar(32).notNull.comment(unconstrained),
				column('source').varchar(32).notNull.comment(unconstrained),
				column('event').varchar(16).notNull.comment(unconstrained),
				column('outcome').varchar(16).notNull.comment(unconstrained),
				column('blockedBy').varchar(32).notNull.comment(unconstrained),
				column('runtimeMs').bigint.notNull.comment('Run time in milliseconds'),
				column('timeSavedMin').int.notNull.comment('Time saved in minutes'),
				column('origin').varchar(8).notNull.comment(unconstrained),
				column('eventId').uuid.notNull.comment('Copied from the ledger row'),
			)
			.withIndexOn(['step', 'ledgerId'], true);
	}

	async down(context: MigrationContext) {
		await this.warnAboutParkedRows(context);
		await context.schemaBuilder.dropTable(tableName);
	}

	// Parked rows are lost on revert. A revert must not fail, so warn instead of refusing.
	private async warnAboutParkedRows({
		escape,
		runQuery,
		queryRunner,
		tablePrefix,
		logger,
		migrationName,
	}: MigrationContext) {
		if (!(await queryRunner.hasTable(`${tablePrefix}${tableName}`))) return;

		const [{ count }] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS "count" FROM ${escape.tableName(tableName)}`,
		);
		if (Number(count) > 0) {
			logger.warn(
				`[${migrationName}] Dropping ${count} parked ledger rows that no replay has read`,
			);
		}
	}
}
