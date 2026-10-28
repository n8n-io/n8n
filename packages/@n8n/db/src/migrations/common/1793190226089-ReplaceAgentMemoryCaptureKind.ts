import type { MigrationContext, ReversibleMigration } from '../migration-types';

const candidateTable = 'agents_memory_entry_candidates';

/**
 * Replaces the capture candidate `kind` with `replacesEarlier`. Only the
 * `correction` kind changed what the runtime does: it starts reflection.
 */
export class ReplaceAgentMemoryCaptureKind1793190226089 implements ReversibleMigration {
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

	/** The other kinds had no effect, so non-corrections come back as `fact`. */
	async down({
		escape,
		runQuery,
		schemaBuilder: { addColumns, addNotNull, column, dropColumns },
	}: MigrationContext) {
		await addColumns(
			candidateTable,
			[
				column('kind')
					.varchar(32)
					.comment(
						'Reason the agent flagged this candidate; see EpisodicMemoryCaptureKind in @n8n/agents',
					),
			],
			{ recreatesOnSqlite: true },
		);
		const replacesEarlier = escape.columnName('replacesEarlier');
		await runQuery(
			`UPDATE ${escape.tableName(candidateTable)} SET ${escape.columnName('kind')} = CASE WHEN ${replacesEarlier} THEN 'correction' ELSE 'fact' END`,
		);
		await addNotNull(candidateTable, 'kind', { recreatesOnSqlite: true });
		await dropColumns(candidateTable, ['replacesEarlier'], { recreatesOnSqlite: true });
	}
}
