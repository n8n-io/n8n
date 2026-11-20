import type { MigrationContext, ReversibleMigration } from '../migration-types';

const projectTable = 'execution_limit_usage';
const instanceTable = 'execution_limit_instance_usage';

/**
 * Run counts for each UTC day and entity type: one table for each project, and one
 * for the instance total. The execution limits fold step adds to the counts, and
 * the limit check reads them.
 */
export class CreateExecutionLimitUsageTable1795078684396 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, createIndex, column },
		escape,
		isPostgres,
		tablePrefix,
		runQuery,
	}: MigrationContext) {
		const startedCount = escape.columnName('startedCount');
		const blockedCount = escape.columnName('blockedCount');

		const day = () => column('day').date.primary.comment('UTC day of the counted ledger row');
		const entityType = () =>
			column('entityType')
				.varchar(16)
				.primary.withEnumCheck(['workflow', 'agent'])
				.comment('workflow: workflow runs; agent: agent messages');
		const counts = () => [
			column('startedCount').int.notNull.default(0).comment('Runs that started on this day'),
			column('blockedCount')
				.int.notNull.default(0)
				.comment(
					'Runs that stopped before their first node. Usage is startedCount minus blockedCount',
				),
			column('updatedAt')
				.timestampTimezone()
				.notNull.default('NOW()')
				.comment('Time of the last fold that changed the row'),
		];

		await createTable(projectTable)
			.withColumns(
				column('projectId')
					.varchar(36)
					.primary.comment(
						'Project at the time of the run. No foreign key: rows outlive the project',
					),
				day(),
				entityType(),
				...counts(),
			)
			.withCheck(
				`CHK_${tablePrefix}${projectTable}_counts_non_negative`,
				`${startedCount} >= 0 AND ${blockedCount} >= 0`,
			);

		// The primary key starts with projectId, so reads of one day for all projects need this.
		await createIndex(projectTable, ['day']);

		// A separate table, so that a sum of project rows can never include the instance total.
		await createTable(instanceTable)
			.withColumns(day(), entityType(), ...counts())
			.withCheck(
				`CHK_${tablePrefix}${instanceTable}_counts_non_negative`,
				`${startedCount} >= 0 AND ${blockedCount} >= 0`,
			);

		if (isPostgres) {
			// The fold updates the rows of the current day in place, next to a large cold history.
			for (const tableName of [projectTable, instanceTable]) {
				await runQuery(
					`ALTER TABLE ${escape.tableName(tableName)} SET (fillfactor = 90, autovacuum_vacuum_scale_factor = 0.0, autovacuum_vacuum_threshold = 1000)`,
				);
			}
		}
	}

	async down(context: MigrationContext) {
		for (const tableName of [instanceTable, projectTable]) {
			await this.warnAboutDroppedRows(context, tableName);
			await context.schemaBuilder.dropTable(tableName);
		}
	}

	// The usage history is lost on revert. A revert must not fail, so warn instead of refusing.
	private async warnAboutDroppedRows(
		{ escape, runQuery, queryRunner, tablePrefix, logger, migrationName }: MigrationContext,
		tableName: string,
	) {
		if (!(await queryRunner.hasTable(`${tablePrefix}${tableName}`))) return;

		const [{ count }] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS "count" FROM ${escape.tableName(tableName)}`,
		);
		if (Number(count) > 0) {
			logger.warn(`[${migrationName}] Dropping ${count} rows of ${tableName}`);
		}
	}
}
