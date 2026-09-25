import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'instance_monitoring_report';
const COLUMN_NAME = 'reportDate';

export class AddReportDateToInstanceMonitoringReport1790262708467 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { addColumns, column, createIndex } = context.schemaBuilder;

		await addColumns(
			TABLE_NAME,
			[
				column(COLUMN_NAME)
					.varchar(10)
					.comment(
						'UTC day the report was created on, as YYYY-MM-DD. Unique, so one report is created a day. Not the days the report covers. NULL only on a legacy row that shared its day with an earlier one.',
					),
			],
			{ recreatesOnSqlite: true },
		);

		await this.backfillReportDate(context);
		await this.clearDuplicateDays(context);

		await createIndex(
			TABLE_NAME,
			[COLUMN_NAME],
			true,
			undefined,
			`${context.escape.columnName(COLUMN_NAME)} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropIndex, dropColumns } }: MigrationContext) {
		await dropIndex(TABLE_NAME, [COLUMN_NAME]);
		await dropColumns(TABLE_NAME, [COLUMN_NAME], { recreatesOnSqlite: true });
	}

	private async backfillReportDate({ escape, isPostgres, runQuery }: MigrationContext) {
		const table = escape.tableName(TABLE_NAME);
		const reportDate = escape.columnName(COLUMN_NAME);
		const createdAt = escape.columnName('createdAt');

		const utcDay = isPostgres
			? `to_char(${createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`
			: `strftime('%Y-%m-%d', ${createdAt})`;

		await runQuery(`UPDATE ${table} SET ${reportDate} = ${utcDay}`);
	}

	/** Keeps the day on its most settled row, so the unique index can be built. */
	private async clearDuplicateDays({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(TABLE_NAME);
		const id = escape.columnName('id');
		const reportDate = escape.columnName(COLUMN_NAME);
		const status = escape.columnName('status');
		const createdAt = escape.columnName('createdAt');

		await runQuery(
			`UPDATE ${table}
			SET ${reportDate} = NULL,
				${status} = CASE ${status} WHEN 'pending' THEN 'skipped_after_max_retries' ELSE ${status} END
			WHERE ${id} IN (
				SELECT ${id} FROM (
					SELECT ${id}, ROW_NUMBER() OVER (
						PARTITION BY ${reportDate}
						ORDER BY
							CASE ${status} WHEN 'delivered' THEN 0 WHEN 'skipped_after_max_retries' THEN 1 ELSE 2 END,
							${createdAt} DESC,
							${id} DESC
					) AS day_rank FROM ${table}
				) ranked WHERE day_rank > 1
			)`,
		);
	}
}
