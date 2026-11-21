import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'execution_ledger';
const columnName = 'projectId';

const comment = 'Project at the time of the event. No foreign key: rows outlive the project';
const nullableComment = `${comment}. Null when the workflow has no owner project`;

/** A run of a workflow with no owner project gets a ledger row with no project. */
export class MakeExecutionLedgerProjectIdNullable1795297187883 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await context.schemaBuilder.dropNotNull(tableName, columnName, { recreatesOnSqlite: true });
		await this.setComment(context, nullableComment);
	}

	async down(context: MigrationContext) {
		await this.deleteRowsWithNoProject(context);
		await context.schemaBuilder.addNotNull(tableName, columnName, { recreatesOnSqlite: true });
		await this.setComment(context, comment);
	}

	// A revert must not fail, so warn and delete the rows that the old schema cannot hold.
	private async deleteRowsWithNoProject({
		escape,
		runQuery,
		logger,
		migrationName,
	}: MigrationContext) {
		const table = escape.tableName(tableName);
		const column = escape.columnName(columnName);

		const [{ count }] = await runQuery<Array<{ count: string | number }>>(
			`SELECT COUNT(*) AS "count" FROM ${table} WHERE ${column} IS NULL`,
		);
		if (Number(count) === 0) return;

		logger.warn(`[${migrationName}] Deleting ${count} ledger rows that have no project`);
		await runQuery(`DELETE FROM ${table} WHERE ${column} IS NULL`);
	}

	private async setComment({ escape, runQuery, isPostgres }: MigrationContext, text: string) {
		if (!isPostgres) return;

		await runQuery(
			`COMMENT ON COLUMN ${escape.tableName(tableName)}.${escape.columnName(columnName)} IS '${text}'`,
		);
	}
}
