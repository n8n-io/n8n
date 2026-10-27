import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'self_healing_investigation';

/**
 * Stores only the published version. The run keeps the captured baseline in memory, and the
 * cooldown needs only this version.
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
				column('publishedVersionId')
					.varchar(36)
					.notNull.comment('Published workflow version checked at admission'),
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

		await dropColumns(table, ['publishedVersionId'], { recreatesOnSqlite: true });
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
