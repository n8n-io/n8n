import type { MigrationContext, ReversibleMigration } from '../migration-types';

const REQUEST_TABLE = 'workflow_review_request';
const WORKFLOW_TABLE = 'workflow_review_request_workflow';
const REVIEWER_TABLE = 'workflow_review_request_reviewers';
const AUTHOR_TABLE = 'workflow_review_request_authors';

const PROJECT_TABLE = 'project';
const USER_TABLE = 'user';
const WORKFLOW_ENTITY_TABLE = 'workflow_entity';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';

const IDX_REQUEST_PROJECT_STATE = 'workflow_review_request_project_state';
const UQ_WORKFLOW_REQUEST_WORKFLOW = 'workflow_review_request_workflow_request_workflow';
const IDX_WORKFLOW_REQUEST_WORKFLOW_WORKFLOW_REQUEST =
	'workflow_review_request_workflow_workflow_request';
const IDX_WORKFLOW_REQUEST_REVIEWERS_USER = 'workflow_review_request_reviewers_user';

export class CreateWorkflowReviewRequestTables1784000000052 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createRequestTable(context);
		await this.createWorkflowChildTable(context);
		await this.createReviewerJunctionTable(context);
		await this.createAuthorJunctionTable(context);
		await this.createChildWorkflowAndJunctionIndexes(context);
	}

	async down({ schemaBuilder: { dropTable }, runQuery, escape, tablePrefix }: MigrationContext) {
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_REVIEWERS_USER)}`);
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_WORKFLOW_REQUEST)}`,
		);
		await runQuery(
			`DROP INDEX IF EXISTS ${this.uniqueIndexName(tablePrefix, UQ_WORKFLOW_REQUEST_WORKFLOW)}`,
		);
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(IDX_REQUEST_PROJECT_STATE)}`);

		await dropTable(AUTHOR_TABLE);
		await dropTable(REVIEWER_TABLE);
		await dropTable(WORKFLOW_TABLE);
		await dropTable(REQUEST_TABLE);
	}

	private uniqueIndexName(tablePrefix: string, name: string): string {
		return `"UQ_${tablePrefix}${name}"`;
	}

	private async createRequestTable({
		schemaBuilder: { createTable, column },
		runQuery,
		escape,
	}: MigrationContext) {
		await createTable(REQUEST_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('projectId').varchar(36).notNull,
				column('state')
					.varchar(16)
					.notNull.default("'open'")
					.withEnumCheck(['open', 'closed'])
					.comment('Review lifecycle: open reviews accept actions; closed reviews are done'),
				column('decision')
					.varchar(50)
					.notNull.default("'pending'")
					.withEnumCheck(['pending', 'changes_requested', 'approved'])
					.comment('Latest review outcome while the request is open'),
				column('title').varchar(255).notNull,
				column('description').text,
				column('createdById').uuid,
				column('updatedById').uuid,
				column('closedById').uuid,
				column('approvedAt').timestampTimezone(),
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('updatedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('closedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			});

		const requestTable = escape.tableName(REQUEST_TABLE);
		const projectIdColumn = escape.columnName('projectId');
		const stateColumn = escape.columnName('state');
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_REQUEST_PROJECT_STATE)}
			ON ${requestTable}(${projectIdColumn}, ${stateColumn})`,
		);
	}

	private async createWorkflowChildTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(WORKFLOW_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('workflowReviewRequestId').varchar(36).notNull,
				column('workflowId').varchar(36).notNull,
				column('workflowVersionId')
					.varchar(36)
					.comment('Pinned workflow_history version for this review item'),
			)
			.withForeignKey('workflowReviewRequestId', {
				tableName: REQUEST_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: WORKFLOW_ENTITY_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowVersionId', {
				tableName: WORKFLOW_HISTORY_TABLE,
				columnName: 'versionId',
				onDelete: 'SET NULL',
			});
	}

	private async createReviewerJunctionTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(REVIEWER_TABLE)
			.withColumns(
				column('workflowReviewRequestId').varchar(36).notNull.primary,
				column('userId').uuid.notNull.primary,
			)
			.withForeignKey('workflowReviewRequestId', {
				tableName: REQUEST_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createAuthorJunctionTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(AUTHOR_TABLE)
			.withColumns(
				column('workflowReviewRequestId').varchar(36).notNull.primary,
				column('userId').uuid.notNull.primary,
			)
			.withForeignKey('workflowReviewRequestId', {
				tableName: REQUEST_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createChildWorkflowAndJunctionIndexes({
		runQuery,
		escape,
		tablePrefix,
	}: MigrationContext) {
		const workflowTable = escape.tableName(WORKFLOW_TABLE);
		const reviewerTable = escape.tableName(REVIEWER_TABLE);
		const requestIdColumn = escape.columnName('workflowReviewRequestId');
		const workflowIdColumn = escape.columnName('workflowId');
		const userIdColumn = escape.columnName('userId');

		await runQuery(
			`CREATE UNIQUE INDEX IF NOT EXISTS ${this.uniqueIndexName(tablePrefix, UQ_WORKFLOW_REQUEST_WORKFLOW)}
			ON ${workflowTable}(${requestIdColumn}, ${workflowIdColumn})`,
		);
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_WORKFLOW_REQUEST)}
			ON ${workflowTable}(${workflowIdColumn}, ${requestIdColumn})`,
		);
		// Leading userId for "assigned to me"; PK is (requestId, userId) so cannot serve that lookup.
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_REVIEWERS_USER)}
			ON ${reviewerTable}(${userIdColumn}, ${requestIdColumn})`,
		);
	}
}
