import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'self_healing_investigation';

/**
 * Stores the version checks apart from the workflow snapshot. PostgreSQL cannot read a field
 * from a json document that contains an escaped NUL, and workflow pin data can contain one.
 */
export class SplitSelfHealingInvestigationBaseline1792750863544 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, dropColumns, column },
		escape,
		runQuery,
	}: MigrationContext) {
		// The feature is behind a flag. Clear investigations instead of splitting saved baselines.
		// Results do not depend on their investigation, so they stay.
		await runQuery(`DELETE FROM ${escape.tableName(table)}`);

		await dropColumns(table, ['baseline'], { recreatesOnSqlite: true });
		await addColumns(
			table,
			[
				column('expectedBaseline').json.notNull.comment(
					'Version checks captured at admission. Holds no workflow content',
				),
				column('original').json.notNull.comment('Workflow snapshot captured at admission'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({
		schemaBuilder: { addColumns, dropColumns, column },
		escape,
		runQuery,
	}: MigrationContext) {
		// The previous schema requires the combined baseline. Clear investigations as in up().
		await runQuery(`DELETE FROM ${escape.tableName(table)}`);

		await dropColumns(table, ['expectedBaseline', 'original'], { recreatesOnSqlite: true });
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
