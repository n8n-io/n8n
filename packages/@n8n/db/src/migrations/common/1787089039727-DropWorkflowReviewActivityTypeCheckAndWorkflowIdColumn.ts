import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'workflow_review_activity';
const TYPE_COLUMN = 'type';
const WORKFLOW_COLUMN = 'workflowId';
const WORKFLOW_TABLE = 'workflow_entity';

/** The vocabulary the CHECK constraint allowed, and all `down()` can leave behind. */
const ORIGINAL_ACTIVITY_TYPES = [
	'review.opened',
	'comment.created',
	'review.changes_requested',
	'review.version_updated',
	'review.approved',
	'workflow.published',
	'review.closed',
];

/**
 * The feed's event vocabulary grows with every review feature, and each widening would otherwise
 * be another CHECK swap — on SQLite a table recreation whose CASCADE risk is documented on the
 * table itself. Writes are typed at compile time by `WorkflowReviewActivityPayload` and unknown
 * types render as a fallback, so app-level integrity replaces the database-level one.
 *
 * `workflowId` goes with it: nothing ever wrote it, and its FK cascades, so a `workflow.deleted`
 * entry scoped through it would delete itself. Per-workflow entries keep the id in `data`.
 */
export class DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn1787089039727
	implements ReversibleMigration
{
	async up({ schemaBuilder: { dropEnumCheck, dropColumns } }: MigrationContext) {
		await dropEnumCheck(ACTIVITY_TABLE, TYPE_COLUMN, { recreatesOnSqlite: true });
		// Drops the column's foreign key with it, on both engines.
		await dropColumns(ACTIVITY_TABLE, [WORKFLOW_COLUMN], { recreatesOnSqlite: true });
	}

	async down(context: MigrationContext) {
		const {
			schemaBuilder: { addEnumCheck, addColumns, addForeignKey, column },
		} = context;

		await this.deleteEntriesOutsideOriginalTypes(context);
		await addEnumCheck(ACTIVITY_TABLE, TYPE_COLUMN, ORIGINAL_ACTIVITY_TYPES, {
			recreatesOnSqlite: true,
		});
		await addColumns(
			ACTIVITY_TABLE,
			[
				column(WORKFLOW_COLUMN)
					.varchar(36)
					.comment('Scopes the entry to one workflow; NULL for review-level entries like comments'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			ACTIVITY_TABLE,
			WORKFLOW_COLUMN,
			[WORKFLOW_TABLE, 'id'],
			undefined,
			'CASCADE',
		);
	}

	/**
	 * Destructive, deliberately: the restored CHECK cannot accept the types written after `up()`,
	 * and those entries have no place in the old vocabulary. Only ever dev and test data — the
	 * feature reached no production instance before this migration.
	 */
	private async deleteEntriesOutsideOriginalTypes({
		escape,
		runQuery,
		logger,
		migrationName,
	}: MigrationContext) {
		const table = escape.tableName(ACTIVITY_TABLE);
		const outsideOriginalTypes = `${escape.columnName(TYPE_COLUMN)} NOT IN (${ORIGINAL_ACTIVITY_TYPES.map(
			(type) => `'${type}'`,
		).join(', ')})`;
		const countColumn = escape.columnName('count');

		const [row] = await runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${countColumn} FROM ${table} WHERE ${outsideOriginalTypes}`,
		);
		// Postgres returns COUNT as a bigint string.
		const count = Number(row.count);
		if (count === 0) return;

		logger.warn(
			`[${migrationName}] Deleting ${count} workflow review activity entries whose type the restored constraint rejects`,
		);
		await runQuery(`DELETE FROM ${table} WHERE ${outsideOriginalTypes}`);
	}
}
