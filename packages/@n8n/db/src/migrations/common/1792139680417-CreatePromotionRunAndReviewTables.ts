import type { MigrationContext, ReversibleMigration } from '../migration-types';

const runTable = 'promotion_run';
const reviewTable = 'promotion_review';
const configTable = 'promotion_config';
const connectionTable = 'promotion_connection';
const userTable = 'user';

// Inlined on purpose: a migration must not import live enums from other packages.
const directions = ['promote', 'apply'];
const reviewTypes = ['gitlab'];
const reviewStates = ['open', 'changes_requested', 'merged', 'closed'];
const runTypes = ['git'];

/**
 * A promotion run is one successful Promote or Apply. A promotion review is the
 * gate on that push. The run points at the review, so one review can collect
 * several runs. A direct push has a run and no review.
 */
export class CreatePromotionRunAndReviewTables1792139680417 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column, createIndex },
		tablePrefix,
		escape,
	}: MigrationContext) {
		// The run references the review, so the review table comes first.
		await createTable(reviewTable)
			.withColumns(
				column('id').uuid.primary,
				column('connectionId')
					.varchar(36)
					.comment(
						'The connection that remoteReviewId resolves through. NULL after the connection is deleted.',
					),
				column('type')
					.varchar(16)
					.notNull.withEnumCheck(reviewTypes)
					.comment('PromotionReviewType enum: "gitlab".'),
				column('remoteReviewId')
					.varchar(255)
					.comment(
						'Host reference for type. GitLab stores "<projectId>!<iid>". NULL when the review lives in n8n.',
					),
				column('state')
					.varchar(32)
					.notNull.default("'open'")
					.withEnumCheck(reviewStates)
					.comment(
						'PromotionReviewState enum: "open", "changes_requested", "merged", "closed". "merged" and "closed" are terminal.',
					),
				column('lastStateChangeAt')
					.timestampTimezone()
					.comment(
						'Time of the latest state change. Covers every transition, including changes_requested and a reopened review. NULL until the first change.',
					),
				column('createdById').uuid.comment(
					'The n8n user whose Promote opened this review. NULL after that user is deleted.',
				),
				column('approvedById').uuid.comment(
					'The one n8n user who approved the review in n8n. NULL until then. n8n does not copy an approver from the host.',
				),
				column('approvedAt').timestampTimezone().comment('When the n8n user approved the review.'),
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
			// Foreign key index, for the SET NULL when the connection is deleted.
			.withIndexOn(['connectionId']);

		// Two hosts can use the same project id and iid. NULL remote ids are not unique.
		await createIndex(
			reviewTable,
			['connectionId', 'remoteReviewId'],
			true,
			undefined,
			`${escape.columnName('remoteReviewId')} IS NOT NULL`,
		);

		await createTable(runTable)
			.withColumns(
				column('id').uuid.primary,
				column('configId')
					.varchar(36)
					.comment('The config this run used. NULL after the config is deleted.'),
				column('direction')
					.varchar(16)
					.notNull.withEnumCheck(directions)
					.comment(
						'PromotionDirection enum: "promote" pushes to the remote, "apply" imports from it. Copied from the config when the run is written.',
					),
				column('type')
					.varchar(16)
					.notNull.withEnumCheck(runTypes)
					.comment('PromotionRunType enum: "git". Git covers GitHub, GitLab and plain Git.'),
				column('createdById').uuid.comment('The user who ran Promote or Apply.'),
				column('details').json.comment(
					'Payload for type. A git run stores schemaVersion, branchName and commitSha. NULL when the type has no details.',
				),
				column('reviewId').uuid.comment(
					'The review this run belongs to. NULL when the push has no review. Not unique: an amend adds another run.',
				),
			)
			.withCreatedAt.withForeignKey('configId', {
				tableName: configTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_configId`,
			})
			.withForeignKey('createdById', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_createdById`,
			})
			.withForeignKey('reviewId', {
				tableName: reviewTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_reviewId`,
			})
			// Foreign key indexes, for SET NULL when the config or the review is deleted.
			.withIndexOn(['configId'])
			.withIndexOn(['reviewId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(runTable);
		await dropTable(reviewTable);
	}
}
