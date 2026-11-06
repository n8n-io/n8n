import type { MigrationContext, ReversibleMigration } from '../migration-types';

const providerTable = 'promotion_provider';
const environmentTable = 'promotion_environment';
const environmentProjectTable = 'promotion_environment_project';
const reviewTable = 'promotion_review';
const runTable = 'promotion_run';
const connectionTable = 'promotion_connection';
const connectionProjectTable = 'promotion_connection_project';
const configTable = 'promotion_config';
const userTable = 'user';

// Inlined on purpose: a migration must not import live enums from other packages.
const directions = ['apply', 'promote'];
const scopes = ['instance', 'projects'];
const reviewTypes = ['gitlab'];
const reviewStates = ['open', 'changes_requested', 'merged', 'closed'];
const runTypes = ['git'];

/**
 * One environment replaces a connection and its per-direction configs: it holds
 * the provider, the remote, and the settings of one direction. Only setups with
 * the promotions feature flag hold promotions data, so the old rows are dropped
 * and not copied. Nothing writes runs or reviews yet, so those tables are created
 * again with a foreign key to the environment.
 */
export class ReplacePromotionConnectionsWithEnvironments1792417570699
	implements ReversibleMigration
{
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { dropTable },
		} = context;
		// Children first, so dropping a parent on SQLite fires no cascades.
		await dropTable(runTable);
		await dropTable(reviewTable);
		await dropTable(connectionProjectTable);
		await dropTable(configTable);
		await dropTable(connectionTable);

		await this.createEnvironmentTable(context);
		await this.createEnvironmentProjectTable(context);
		await this.createReviewTable(context);
		await this.createRunTable(context);
	}

	async down(context: MigrationContext) {
		const {
			schemaBuilder: { dropTable },
		} = context;
		await dropTable(runTable);
		await dropTable(reviewTable);
		await dropTable(environmentProjectTable);
		await dropTable(environmentTable);

		await this.recreateConnectionTables(context);
		await this.recreateRunAndReviewTables(context);
	}

	private async createEnvironmentTable({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
		escape,
	}: MigrationContext) {
		await createTable(environmentTable)
			.withColumns(
				column('id').uuid.primary.comment('Also the name of the local checkout directory.'),
				column('name').varchar(128).notNull,
				column('providerId')
					.varchar(36)
					.notNull.comment('The provider whose credentials this environment uses.'),
				column('direction')
					.varchar(16)
					.notNull.withEnumCheck(directions)
					.comment('PromotionDirection enum: "apply", "promote". Cannot change after creation.'),
				column('scope')
					.varchar(16)
					.notNull.withEnumCheck(scopes)
					.comment(
						'PromotionEnvironmentScope enum: "instance", "projects". Cannot change after creation.',
					),
				column('remote').json.notNull.comment(
					'Where to push and pull. The provider type picks the shape: plain Git stores remoteUrl, a Git host stores repositoryPath. Has its own schemaVersion.',
				),
				column('settings').json.notNull.comment(
					'Settings of one direction. direction picks the shape: apply stores branchName, promote stores baseBranchName and createBranchOnPromotion. Has its own schemaVersion. Validated in code.',
				),
			)
			// RESTRICT, not CASCADE: one provider can serve many environments, so deleting
			// it must not take their configuration with it.
			.withTimestamps.withForeignKey('providerId', {
				tableName: providerTable,
				columnName: 'id',
				onDelete: 'RESTRICT',
				name: `FK_${tablePrefix}promotion_environment_providerId`,
			})
			.withIndexOn(['providerId']);

		// One instance environment for each direction, but any number of project ones.
		// A count check in code would let two slip through at the same time.
		await createIndex(
			environmentTable,
			['direction'],
			true,
			undefined,
			`${escape.columnName('scope')} = 'instance'`,
		);
	}

	private async createEnvironmentProjectTable({
		schemaBuilder: { createTable, column },
		tablePrefix,
	}: MigrationContext) {
		// The (projectId, direction) key gives a project one environment for each
		// direction. The service copies the direction from the environment.
		await createTable(environmentProjectTable)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('direction')
					.varchar(16)
					.primary.withEnumCheck(directions)
					.comment(
						'PromotionDirection enum: "apply", "promote". The direction of the environment.',
					),
				column('environmentId').uuid.notNull,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_environment_project_projectId`,
			})
			.withForeignKey('environmentId', {
				tableName: environmentTable,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_environment_project_environmentId`,
			})
			// Index the foreign key, for listing an environment's projects and for the
			// cascade delete.
			.withIndexOn(['environmentId']);
	}

	private async createReviewTable({
		schemaBuilder: { createTable, column, createIndex },
		tablePrefix,
		escape,
	}: MigrationContext) {
		await createTable(reviewTable)
			.withColumns(
				column('id').uuid.primary,
				column('environmentId').uuid.comment(
					'The environment that remoteReviewId resolves through. NULL after the environment is deleted.',
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
			.withCreatedAt.withForeignKey('environmentId', {
				tableName: environmentTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_review_environmentId`,
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
			// Foreign key index, for the SET NULL when the environment is deleted.
			.withIndexOn(['environmentId']);

		// Two hosts can use the same project id and iid. NULL remote ids are not unique.
		await createIndex(
			reviewTable,
			['environmentId', 'remoteReviewId'],
			true,
			undefined,
			`${escape.columnName('remoteReviewId')} IS NOT NULL`,
		);
	}

	private async createRunTable({
		schemaBuilder: { createTable, column },
		tablePrefix,
	}: MigrationContext) {
		await createTable(runTable)
			.withColumns(
				column('id').uuid.primary,
				column('environmentId').uuid.comment(
					'The environment this run used. NULL after the environment is deleted.',
				),
				column('direction')
					.varchar(16)
					.notNull.withEnumCheck(directions)
					.comment(
						'PromotionDirection enum: "promote" pushes to the remote, "apply" imports from it. Copied from the environment when the run is written.',
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
			.withCreatedAt.withForeignKey('environmentId', {
				tableName: environmentTable,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_environmentId`,
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
			// Foreign key indexes, for SET NULL when the environment or the review is deleted.
			.withIndexOn(['environmentId'])
			.withIndexOn(['reviewId']);
	}

	/** The connection, link, and config tables as `CreatePromotionsTables1788759351166` left them. */
	private async recreateConnectionTables({
		schemaBuilder: { createTable, createIndex, column },
		tablePrefix,
		escape,
	}: MigrationContext) {
		await createTable(connectionTable)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(128).notNull,
				column('providerId')
					.varchar(36)
					.notNull.comment('The provider whose credentials this connection uses.'),
				column('scope')
					.varchar(16)
					.notNull.withEnumCheck(scopes)
					.comment(
						'PromotionConnectionScope enum: "instance", "projects". Cannot change after creation.',
					),
				column('target').json.notNull.comment(
					'Where to push and pull, with its own schemaVersion. Plain Git stores the full remote URL.',
				),
			)
			.withTimestamps.withForeignKey('providerId', {
				tableName: providerTable,
				columnName: 'id',
				onDelete: 'RESTRICT',
				name: `FK_${tablePrefix}promotion_connection_providerId`,
			})
			.withIndexOn(['providerId']);
		await createIndex(
			connectionTable,
			['scope'],
			true,
			undefined,
			`${escape.columnName('scope')} = 'instance'`,
		);

		await createTable(connectionProjectTable)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('connectionId').varchar(36).notNull,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_connection_project_projectId`,
			})
			.withForeignKey('connectionId', {
				tableName: connectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_connection_project_connectionId`,
			})
			.withIndexOn(['connectionId']);

		await createTable(configTable)
			.withColumns(
				column('id').varchar(36).primary.comment('Also the name of the local checkout directory.'),
				column('connectionId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('direction')
					.varchar(16)
					.notNull.withEnumCheck(directions)
					.comment('PromotionDirection enum: "apply", "promote". Cannot change after creation.'),
				column('settings').json.notNull.comment(
					'Branch settings for this direction, with their own schemaVersion. Validated in code.',
				),
			)
			.withTimestamps.withForeignKey('connectionId', {
				tableName: connectionTable,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}promotion_config_connectionId`,
			});
		await createIndex(configTable, ['connectionId', 'direction'], true);
	}

	/** The run and review tables as `CreatePromotionRunAndReviewTables1792139680417` left them. */
	private async recreateRunAndReviewTables({
		schemaBuilder: { createTable, column, createIndex },
		tablePrefix,
		escape,
	}: MigrationContext) {
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
			.withIndexOn(['state', 'createdAt'])
			.withIndexOn(['connectionId']);
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
			.withIndexOn(['configId'])
			.withIndexOn(['reviewId']);
	}
}
