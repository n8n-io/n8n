import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ACTIVITY_TABLE = 'workflow_review_activity';
const COMMENT_TABLE = 'workflow_review_activity_comment';

const REQUEST_TABLE = 'workflow_review_request';
const USER_TABLE = 'user';

export class CreateWorkflowReviewActivityTables1785843640527 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createActivityTable(context);
		await this.createCommentTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		// Comment table first: its FK blocks dropping the activity table on Postgres.
		await dropTable(COMMENT_TABLE);
		await dropTable(ACTIVITY_TABLE);
	}

	private async createActivityTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable(ACTIVITY_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowReviewRequestId').varchar(36).notNull,
				column('type')
					.varchar(64)
					.notNull.comment('Feed entry kind; see WorkflowReviewActivityType in @n8n/db'),
				column('typeVersion')
					.int.notNull.default(1)
					.comment('Schema version of the `data` payload for this `type`'),
				column('groupId').int.comment('Activity entry this one replies to; NULL means top-level'),
				column('data').json.comment(
					'Immutable per-type detail, ids only; user references belong in `createdById` so deletion nulls them',
				),
				column('createdById').uuid,
			)
			.withCreatedAt.withForeignKey('workflowReviewRequestId', {
				tableName: REQUEST_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('groupId', {
				tableName: ACTIVITY_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		// Feed read: all entries for one request ORDER BY id, keyset paginated on id.
		// Leading column also serves the request FK cascade.
		await createIndex(
			ACTIVITY_TABLE,
			['workflowReviewRequestId', 'id'],
			false,
			`IDX_${tablePrefix}workflow_review_activity_request`,
		);

		// Index the groupId self-FK so deleting activity rows does not seq-scan this table
		// once per deleted row. Partial: top-level entries (NULL groupId) never use it, and
		// any groupId lookup implies NOT NULL, so the planner still uses it for the cascade.
		await createIndex(
			ACTIVITY_TABLE,
			['groupId'],
			false,
			`IDX_${tablePrefix}workflow_review_activity_group`,
			'"groupId" IS NOT NULL',
		);
	}

	private async createCommentTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(COMMENT_TABLE)
			.withColumns(
				column('activityId').int.primary,
				column('body').text.comment('Only user-editable text in the feed; nulled on delete'),
				column('data').json.comment(
					'Reserved for comment revision history; cleared alongside `body` on delete',
				),
				column('updatedAt').timestampTimezone().comment('Set when the body is edited'),
				column('deletedAt').timestampTimezone().comment('Set when the comment is deleted'),
			)
			.withCreatedAt.withForeignKey('activityId', {
				tableName: ACTIVITY_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}
}
