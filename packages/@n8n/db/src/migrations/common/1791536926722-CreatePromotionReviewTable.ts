import type { MigrationContext, ReversibleMigration } from '../migration-types';

const reviewTable = 'promotion_review';
const connectionTable = 'promotion_connection';
const userTable = 'user';

/**
 * One row per Promote that opened a review on a Git host. The row holds what
 * only n8n knows (who promoted, what was pushed, who approved in n8n), an
 * opaque reference to the review on the host, and the review state. Title,
 * URL and conflicts are read from the host and never stored.
 */
export class CreatePromotionReviewTable1791536926722 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(reviewTable)
			.withColumns(
				column('id').varchar(36).primary,
				column('connectionId')
					.varchar(36)
					.comment('The connection that pushed the branch. NULL after the connection is deleted.'),
				column('createdById').uuid.comment('The user who ran Promote.'),
				column('branchName').varchar(255).notNull.comment('The promotion branch that was pushed.'),
				column('commitSha').varchar(64).notNull.comment('The commit n8n pushed; the diff head.'),
				column('remoteReviewId')
					.varchar(255)
					.notNull.comment(
						'Opaque reference to the review on the host. The prefix names the host kind, the rest is parsed by that host client, e.g. "gitlab:<projectId>!<iid>".',
					),
				column('state')
					.varchar(16)
					.notNull.default("'open'")
					.withEnumCheck(['open', 'merged', 'closed', 'unavailable'])
					.comment(
						'PromotionReviewState enum: "open", "merged", "closed", "unavailable". Only "open" rows are refreshed from the host.',
					),
				column('mergedAt').timestampTimezone().comment('Mirrored from the host.'),
				column('closedAt').timestampTimezone().comment('Mirrored from the host.'),
				column('approvedById').uuid.comment(
					'The n8n user who approved the review in n8n. NULL when approval happened on the host.',
				),
				column('approvedAt').timestampTimezone(),
			)
			.withCreatedAt.withForeignKey('connectionId', {
				tableName: connectionTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_connectionId`,
			})
			.withForeignKey('createdById', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_createdById`,
			})
			.withForeignKey('approvedById', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_approvedById`,
			})
			// The inbox lists by state and orders by creation time.
			.withIndexOn(['state', 'createdAt'])
			// Foreign key index, for the SET NULL on connection delete.
			.withIndexOn(['connectionId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(reviewTable);
	}
}
