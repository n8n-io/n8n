import type { MigrationContext, ReversibleMigration } from '../migration-types';

const RESULT_TABLE = 'self_healing_result';
const SUGGESTION_TABLE = 'workflow_suggestion';
const RESULT_ID = 'selfHealingResultId';
const SUGGESTION_ID = 'suggestionId';
const REVIEW_STATE = 'reviewState';
const DISMISSED_AT = 'dismissedAt';
const DISMISSED_BY_ID = 'dismissedById';
// Named because SQLite drops a foreign key only when the constraint name matches.
const RESULT_FK = 'FK_workflow_suggestion_self_healing_result';
const SUGGESTION_FK = 'FK_self_healing_result_suggestion';
const DISMISSED_BY_FK = 'FK_self_healing_result_dismissed_by';

// The feature is unreleased, so existing rows are deleted instead of converted.
// Empty tables also make the SQLite table rebuilds safe for incoming foreign keys.
async function clearSelfHealingData({ escape, runQuery }: MigrationContext) {
	for (const table of [
		'self_healing_investigation',
		RESULT_TABLE,
		'workflow_suggestion_activity',
		SUGGESTION_TABLE,
	]) {
		await runQuery(`DELETE FROM ${escape.tableName(table)}`);
	}
}

export class LinkWorkflowSuggestionsToSelfHealingResult1793288106000
	implements ReversibleMigration
{
	async up(context: MigrationContext) {
		const { addColumns, addForeignKey, createIndex, dropColumns, column } = context.schemaBuilder;
		await clearSelfHealingData(context);
		await dropColumns(RESULT_TABLE, [SUGGESTION_ID, DISMISSED_AT, DISMISSED_BY_ID], {
			recreatesOnSqlite: true,
		});
		await addColumns(
			RESULT_TABLE,
			[
				column(REVIEW_STATE)
					.varchar(16)
					.notNull.default("'open'")
					.withEnumCheck(['open', 'applied', 'outdated', 'dismissed', 'closed'])
					.comment('Review state of the result and its suggestions'),
			],
			{ recreatesOnSqlite: true },
		);
		await addColumns(
			SUGGESTION_TABLE,
			[
				column(RESULT_ID)
					.varchar(36)
					.notNull.comment('Self-healing result that groups this suggestion'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(SUGGESTION_TABLE, RESULT_ID, [RESULT_TABLE, 'id'], RESULT_FK, 'CASCADE');
		await createIndex(SUGGESTION_TABLE, [RESULT_ID]);
	}

	async down(context: MigrationContext) {
		const { addColumns, addForeignKey, createIndex, dropColumns, dropEnumCheck, column } =
			context.schemaBuilder;
		const { escape } = context;
		await clearSelfHealingData(context);
		await dropColumns(SUGGESTION_TABLE, [RESULT_ID], { recreatesOnSqlite: true });
		await dropEnumCheck(RESULT_TABLE, REVIEW_STATE, { recreatesOnSqlite: true });
		await dropColumns(RESULT_TABLE, [REVIEW_STATE], { recreatesOnSqlite: true });
		await addColumns(
			RESULT_TABLE,
			[
				column(SUGGESTION_ID).varchar(36).comment('Optional isolated workflow suggestion'),
				column(DISMISSED_AT).timestampTimezone(),
				column(DISMISSED_BY_ID).uuid.comment('Reviewer who dismissed the result'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(RESULT_TABLE, DISMISSED_BY_ID, ['user', 'id'], DISMISSED_BY_FK, 'SET NULL');
		await createIndex(RESULT_TABLE, [DISMISSED_BY_ID]);
		await addForeignKey(
			RESULT_TABLE,
			SUGGESTION_ID,
			[SUGGESTION_TABLE, 'id'],
			SUGGESTION_FK,
			'CASCADE',
		);
		await createIndex(
			RESULT_TABLE,
			[SUGGESTION_ID],
			true,
			undefined,
			`${escape.columnName(SUGGESTION_ID)} IS NOT NULL`,
		);
	}
}
