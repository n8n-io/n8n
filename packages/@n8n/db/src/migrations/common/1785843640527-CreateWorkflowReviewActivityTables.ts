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
				column('data').json.comment('Detail per activity type'),
				column('createdById').uuid,
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
}
