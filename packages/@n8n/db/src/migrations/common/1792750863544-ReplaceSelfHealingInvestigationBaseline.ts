import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'self_healing_investigation';

/**
 * Keeps only the version checks. Completion reads the workflow content from the workflow.
 * The column holds no pin data, so PostgreSQL can read its fields. An escaped NUL in a json
 * document blocks field reads, and pin data can contain one.
 */
export class ReplaceSelfHealingInvestigationBaseline1792750863544 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, dropColumns, column },
		escape,
		runQuery,
	}: MigrationContext) {
		// The feature is behind a flag. Clear investigations instead of converting saved baselines.
		// Results do not depend on their investigation, so they stay.
		await runQuery(`DELETE FROM ${escape.tableName(table)}`);

		await dropColumns(table, ['baseline'], { recreatesOnSqlite: true });
		await addColumns(
			table,
			[
				column('expectedBaseline').json.notNull.comment(
					'Version checks captured at admission. Holds no workflow content',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({
		schemaBuilder: { addColumns, dropColumns, column },
		escape,
		runQuery,
	}: MigrationContext) {
		// The previous schema requires the workflow snapshot. Clear investigations as in up().
		await runQuery(`DELETE FROM ${escape.tableName(table)}`);

		await dropColumns(table, ['expectedBaseline'], { recreatesOnSqlite: true });
		await addColumns(
			table,
			[
				column('baseline').json.notNull.comment(
					'Workflow snapshot and version checks captured at admission',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}
}
