import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'execution_limit_usage';

/**
 * Run counts for each project, UTC day and entity type. The execution limits
 * fold step adds to the counts, and the limit check reads them.
 */
export class CreateExecutionLimitUsageTable1795078684396 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column },
		escape,
		isPostgres,
		tablePrefix,
		runQuery,
	}: MigrationContext) {
		const startedCount = escape.columnName('startedCount');
		const blockedCount = escape.columnName('blockedCount');

		await createTable(tableName)
			.withColumns(
				column('projectId')
					.varchar(36)
					.primary.comment(
						'Project at the time of the run, or instance for the instance total. No foreign key: rows outlive the project',
					),
				column('day').date.primary.comment('UTC day of the counted ledger row'),
				column('entityType')
					.varchar(16)
					.primary.withEnumCheck(['workflow', 'agent'])
					.comment('workflow: workflow runs; agent: agent messages'),
				column('startedCount').int.notNull.default(0).comment('Runs that started on this day'),
				column('blockedCount')
					.int.notNull.default(0)
					.comment(
						'Runs that stopped before their first node. Usage is startedCount minus blockedCount',
					),
				column('updatedAt')
					.timestampTimezone()
					.notNull.comment('Time of the last fold that changed the row'),
			)
			.withCheck(
				`CHK_${tablePrefix}${tableName}_counts_non_negative`,
				`${startedCount} >= 0 AND ${blockedCount} >= 0`,
			);

		if (isPostgres) {
			// The fold updates the rows of the current day in place, next to a large cold history.
			await runQuery(
				`ALTER TABLE ${escape.tableName(tableName)} SET (fillfactor = 90, autovacuum_vacuum_scale_factor = 0.0, autovacuum_vacuum_threshold = 1000)`,
			);
		}
	}

	async down(context: MigrationContext) {
		await this.warnAboutDroppedRows(context);
		await context.schemaBuilder.dropTable(tableName);
	}

	// The usage history is lost on revert. A revert must not fail, so warn instead of refusing.
	private async warnAboutDroppedRows({
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
			logger.warn(`[${migrationName}] Dropping ${count} execution limit usage rows`);
		}
	}
}
