import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'workflow_review_activity';
const COMMENT_TABLE = 'workflow_review_activity_comment';

const REQUEST_TABLE = 'workflow_review_request';
const REQUEST_WORKFLOW_TABLE = 'workflow_review_request_workflow';
const REQUEST_AUTHORS_TABLE = 'workflow_review_request_authors';
const WORKFLOW_TABLE = 'workflow_entity';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';
const USER_TABLE = 'user';

const BASELINE_VERSION_COLUMN = 'baselineVersionId';
// Named explicitly because SQLite drops a foreign key by matching the constraint name only:
// an unnamed one never matches the loaded (auto-named) constraint and silently stays behind.
const BASELINE_VERSION_FK = 'FK_workflow_review_request_workflow_baselineVersionId';

const ACTIVITY_TYPES = [
	'review.opened',
	'comment.created',
	'review.changes_requested',
	'review.version_updated',
	'review.approved',
	'workflow.published',
	'review.closed',
];

export class CreateWorkflowReviewActivityTablesAndBaseline1785843640527
	implements ReversibleMigration
{
	async up(context: MigrationContext) {
		await this.createActivityTable(context);
		await this.createCommentTable(context);
		await this.addBaselineVersionColumn(context);
		await this.addAuthorsUserIndex(context);
	}

	async down(context: MigrationContext) {
		await this.dropAuthorsUserIndex(context);
		await this.dropBaselineVersionColumn(context);
		// Comment table first: its FK blocks dropping the activity table on Postgres.
		await context.schemaBuilder.dropTable(COMMENT_TABLE);
		await context.schemaBuilder.dropTable(ACTIVITY_TABLE);
	}

	private async createActivityTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable(ACTIVITY_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowReviewRequestId').varchar(36).notNull,
				// Widening this list later needs a sqlite/ subclass with `withFKsDisabled = true as
				// const`: on SQLite dropEnumCheck/addEnumCheck recreate the table, and the comment
				// table's ON DELETE CASCADE FK would take every comment row with it.
				column('type')
					.varchar(64)
					.notNull.withEnumCheck(ACTIVITY_TYPES)
					.comment('Feed entry kind; see WorkflowReviewActivityType in @n8n/api-types'),
				column('typeVersion')
					.int.notNull.default(1)
					.comment('Schema version of the `data` payload for this `type`'),
				column('data').json.comment('Detail per activity type'),
				column('createdById').uuid,
				// A column rather than a key in `data` so the feed can query and filter on it
				// directly, for instance by what the reader may open.
				column('workflowId')
					.varchar(36)
					.comment('Scopes the entry to one workflow; NULL for review-level entries like comments'),
			)
			.withCreatedAt.withForeignKey('workflowReviewRequestId', {
				tableName: REQUEST_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			// CASCADE, never SET NULL: NULL means "review-level", so nulling this on workflow
			// deletion would widen a scoped entry to everyone who can read the review.
			.withForeignKey('workflowId', {
				tableName: WORKFLOW_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// Feed read: all entries for one request ORDER BY id, keyset paginated on id.
		// Leading column also serves the request FK cascade.
		await createIndex(
			ACTIVITY_TABLE,
			['workflowReviewRequestId', 'id'],
			false,
			`IDX_${tablePrefix}workflow_review_activity_request`,
		);
	}

	private async createCommentTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable(COMMENT_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('activityId').int.notNull.comment(
					'Thread this message belongs to; the activity row is its header',
				),
				column('createdById').uuid,
				column('body').text.comment('Only user-editable text in the feed; nulled on delete'),
				column('history').json.comment('Comment revision history.'),
				column('updatedAt').timestampTimezone().comment('Set when the body is edited'),
				column('deletedAt').timestampTimezone().comment('Set when the comment is deleted'),
			)
			.withCreatedAt.withForeignKey('activityId', {
				tableName: ACTIVITY_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		// Thread read: all messages for one activity row ORDER BY id.
		// Leading column also serves the activity FK cascade.
		await createIndex(
			COMMENT_TABLE,
			['activityId', 'id'],
			false,
			`IDX_${tablePrefix}workflow_review_activity_comment_activity`,
		);
	}

	/**
	 * Rides along with the activity tables so the review feature needs a single schema change:
	 * the feed records that a version was approved, this column pins which one.
	 */
	private async addBaselineVersionColumn({
		schemaBuilder: { addColumns, addForeignKey, column },
	}: MigrationContext) {
		await addColumns(
			REQUEST_WORKFLOW_TABLE,
			[
				column(BASELINE_VERSION_COLUMN)
					.varchar(36)
					.comment('Published workflow_history version captured when the review was approved'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			REQUEST_WORKFLOW_TABLE,
			BASELINE_VERSION_COLUMN,
			[WORKFLOW_HISTORY_TABLE, 'versionId'],
			BASELINE_VERSION_FK,
			'SET NULL',
		);
	}

	/**
	 * The authors table's primary key leads on `workflowReviewRequestId`, so "which reviews did I
	 * author" cannot use it. Mirrors the index the reviewers table already carries. Added here
	 * rather than in its own migration because that table's own migration has already shipped.
	 */
	private async addAuthorsUserIndex({
		schemaBuilder: { createIndex },
		tablePrefix,
	}: MigrationContext) {
		await createIndex(
			REQUEST_AUTHORS_TABLE,
			['userId', 'workflowReviewRequestId'],
			false,
			`IDX_${tablePrefix}workflow_review_request_authors_user`,
		);
	}

	private async dropAuthorsUserIndex({
		schemaBuilder: { dropIndex },
		tablePrefix,
	}: MigrationContext) {
		await dropIndex(REQUEST_AUTHORS_TABLE, ['userId', 'workflowReviewRequestId'], {
			customIndexName: `IDX_${tablePrefix}workflow_review_request_authors_user`,
		});
	}

	private async dropBaselineVersionColumn({
		schemaBuilder: { dropColumns, dropForeignKey },
	}: MigrationContext) {
		await dropForeignKey(
			REQUEST_WORKFLOW_TABLE,
			BASELINE_VERSION_COLUMN,
			[WORKFLOW_HISTORY_TABLE, 'versionId'],
			BASELINE_VERSION_FK,
		);
		await dropColumns(REQUEST_WORKFLOW_TABLE, [BASELINE_VERSION_COLUMN], {
			recreatesOnSqlite: true,
		});
	}
}
