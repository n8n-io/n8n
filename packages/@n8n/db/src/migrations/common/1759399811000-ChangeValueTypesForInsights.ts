import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const INSIGHTS_RAW_TABLE_NAME = 'insights_raw';
const INSIGHTS_RAW_TEMP_TABLE_NAME = 'temp_insights_raw';
const INSIGHTS_BY_PERIOD_TABLE_NAME = 'insights_by_period';
const INSIGHTS_BY_PERIOD_TEMP_TABLE_NAME = 'temp_insights_by_period';
const INSIGHTS_METADATA_TABLE_NAME = 'insights_metadata';
const VALUE_COLUMN_NAME = 'value';

export class ChangeValueTypesForInsights1759399811000 implements IrreversibleMigration {
	async up({
		isSqlite,
		isMysql,
		isPostgres,
		escape,
		copyTable,
		queryRunner,
		schemaBuilder: { createTable, column, dropTable },
	}: MigrationContext) {
		const insightsRawTable = escape.tableName(INSIGHTS_RAW_TABLE_NAME);
		const insightsByPeriodTable = escape.tableName(INSIGHTS_BY_PERIOD_TABLE_NAME);
		const valueColumnName = escape.columnName(VALUE_COLUMN_NAME);

		if (isSqlite) {
			const tempInsightsByPeriodTable = escape.tableName(INSIGHTS_BY_PERIOD_TEMP_TABLE_NAME);
			const tempInsightsRawTable = escape.tableName(INSIGHTS_RAW_TEMP_TABLE_NAME);
			const typeComment = '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';

			// Create temporary raw table with new value type, copy data, remove the original table and rename the temporary table
			await createTable(INSIGHTS_RAW_TEMP_TABLE_NAME)
				.withColumns(
					column('id').int.primary.autoGenerate2,
					column('metaId').int.notNull,
					column('type').int.notNull.comment(typeComment),
					column('value').bigint.notNull,
					column('timestamp').timestampTimezone(0).default('CURRENT_TIMESTAMP').notNull,
				)
				.withForeignKey('metaId', {
					tableName: INSIGHTS_METADATA_TABLE_NAME,
					columnName: 'metaId',
					onDelete: 'CASCADE',
				});

			// Copy data from the original table to the temporary table
			await copyTable(INSIGHTS_RAW_TABLE_NAME, INSIGHTS_RAW_TEMP_TABLE_NAME);

			// drop the original table
			await dropTable(INSIGHTS_RAW_TABLE_NAME);

			// rename the temporary table to the original table name
			await queryRunner.query(`ALTER TABLE ${tempInsightsRawTable} RENAME TO ${insightsRawTable};`);

			await createTable(INSIGHTS_BY_PERIOD_TEMP_TABLE_NAME)
				.withColumns(
					column('id').int.primary.autoGenerate2,
					column('metaId').int.notNull,
					column('type').int.notNull.comment(typeComment),
					column('value').bigint.notNull,
					column('periodUnit').int.notNull.comment('0: hour, 1: day, 2: week'),
					column('periodStart').default('CURRENT_TIMESTAMP').timestampTimezone(0),
				)
				.withForeignKey('metaId', {
					tableName: INSIGHTS_METADATA_TABLE_NAME,
					columnName: 'metaId',
					onDelete: 'CASCADE',
				})
				.withIndexOn(['periodStart', 'type', 'periodUnit', 'metaId'], true);

			// Copy data from the original table to the temporary table
			await copyTable(INSIGHTS_BY_PERIOD_TABLE_NAME, INSIGHTS_BY_PERIOD_TEMP_TABLE_NAME);

			// drop the original table
			await dropTable(INSIGHTS_BY_PERIOD_TABLE_NAME);

			// rename the temporary table to the original table name
			await queryRunner.query(
				`ALTER TABLE ${tempInsightsByPeriodTable} RENAME TO ${insightsByPeriodTable};`,
			);
		} else if (isMysql) {
			await queryRunner.query(
				`ALTER TABLE ${insightsRawTable} MODIFY COLUMN ${valueColumnName} BIGINT NOT NULL;`,
			);
			await queryRunner.query(
				`ALTER TABLE ${insightsByPeriodTable} MODIFY COLUMN ${valueColumnName} BIGINT NOT NULL;`,
			);
		} else if (isPostgres) {
			await queryRunner.query(
				`ALTER TABLE ${insightsRawTable} ALTER COLUMN ${valueColumnName} TYPE BIGINT;`,
			);
			await queryRunner.query(
				`ALTER TABLE ${insightsByPeriodTable} ALTER COLUMN ${valueColumnName} TYPE BIGINT;`,
			);
		}
	}
}
