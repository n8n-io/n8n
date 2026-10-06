import type { MigrationContext, ReversibleMigration } from '../migration-types';

const REVIEW_TABLE = 'promotion_review';
const CONNECTION_TABLE = 'promotion_connection';
const USER_TABLE = 'user';

/**
 * One row per Promote that opened a review on a Git host. The row holds what
 * only n8n knows (who promoted, what was pushed, who approved in n8n), a
 * reference to the review on the host, and the review state. Everything else
 * about the review is read from the host.
 */
export class CreatePromotionReviewTable1791212100192 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column }, tablePrefix }: MigrationContext) {
		await createTable(REVIEW_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('connectionId')
					.varchar(36)
					.comment('The connection that pushed the branch. NULL after the connection is deleted.'),
				column('createdById').uuid.comment('The user who ran Promote.'),
				column('branchName').varchar(255).notNull.comment('The promotion branch that was pushed.'),
				column('commitSha').varchar(64).notNull.comment('The pushed commit.'),
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
				column('mergedAt').timestampTimezone(),
				column('closedAt').timestampTimezone(),
				column('approvedById').uuid.comment('The n8n user who approved the review in n8n.'),
				column('approvedAt').timestampTimezone(),
			)
			.withCreatedAt.withForeignKey('connectionId', {
				tableName: CONNECTION_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_connectionId`,
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_createdById`,
			})
			.withForeignKey('approvedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_approvedById`,
			});

		// The inbox lists by state and orders by creation time.
		await createIndex(REVIEW_TABLE, ['state', 'createdAt']);
		// Index the foreign key, for the SET NULL on connection delete.
		await createIndex(REVIEW_TABLE, ['connectionId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(REVIEW_TABLE);
	}
}
