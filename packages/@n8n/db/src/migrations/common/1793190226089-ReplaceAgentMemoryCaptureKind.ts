import type { MigrationContext, IrreversibleMigration } from '../migration-types';

const candidateTable = 'agents_memory_entry_candidates';

/**
 * Replaces the capture candidate `kind` with `replacesEarlier`. Only the
 * `correction` kind changed what the runtime does: it starts reflection.
 * The other kinds collapse to `false`, so a rollback cannot restore them.
 */
export class ReplaceAgentMemoryCaptureKind1793190226089 implements IrreversibleMigration {
	async up({
		escape,
		runQuery,
		schemaBuilder: { addColumns, column, dropColumns },
	}: MigrationContext) {
		await addColumns(
			candidateTable,
			[
				column('replacesEarlier')
					.bool.notNull.default(false)
					.comment('The agent marked the fact as a correction of something stated earlier'),
			],
			{ recreatesOnSqlite: true },
		);
		await runQuery(
			`UPDATE ${escape.tableName(candidateTable)} SET ${escape.columnName('replacesEarlier')} = (${escape.columnName('kind')} = 'correction')`,
		);
		await dropColumns(candidateTable, ['kind'], { recreatesOnSqlite: true });
	}
}
