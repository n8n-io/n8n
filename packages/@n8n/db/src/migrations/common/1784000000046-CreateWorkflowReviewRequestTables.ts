import type { MigrationContext, ReversibleMigration } from '../migration-types';

const REQUEST_TABLE = 'workflow_review_request';
const WORKFLOW_TABLE = 'workflow_review_request_workflow';
const REVIEWER_TABLE = 'workflow_review_request_reviewers';
const AUTHOR_TABLE = 'workflow_review_request_authors';

const PROJECT_TABLE = 'project';
const USER_TABLE = 'user';
const WORKFLOW_ENTITY_TABLE = 'workflow_entity';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';

const IDX_REQUEST_PROJECT_STATUS_CREATED = 'workflow_review_request_project_status_created';
const IDX_REQUEST_OPEN_PROJECT_CREATED = 'workflow_review_request_open_project_created';
const IDX_WORKFLOW_REQUEST_WORKFLOW_UNIQUE = 'workflow_review_request_workflow_request_workflow';
const IDX_WORKFLOW_REQUEST_WORKFLOW_VERSION = 'workflow_review_request_workflow_workflow_version';
const IDX_WORKFLOW_REQUEST_WORKFLOW_WORKFLOW_ID = 'workflow_review_request_workflow_workflow_id';
const IDX_WORKFLOW_REQUEST_REVIEWERS_UNIQUE = 'workflow_review_request_reviewers_request_user';
const IDX_WORKFLOW_REQUEST_REVIEWERS_USER_ID = 'workflow_review_request_reviewers_user_id';
const IDX_WORKFLOW_REQUEST_AUTHORS_UNIQUE = 'workflow_review_request_authors_request_user';
const IDX_WORKFLOW_REQUEST_AUTHORS_USER_ID = 'workflow_review_request_authors_user_id';

export class CreateWorkflowReviewRequestTables1784000000046 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createRequestTable(context);
		await this.createWorkflowChildTable(context);
		await this.createReviewerJunctionTable(context);
		await this.createAuthorJunctionTable(context);
		await this.createRequestIndexes(context);
		await this.createChildReviewerAndAuthorIndexes(context);
	}

	async down({ schemaBuilder: { dropTable }, runQuery, escape }: MigrationContext) {
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_AUTHORS_USER_ID)}`,
		);
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_AUTHORS_UNIQUE)}`);
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_REVIEWERS_USER_ID)}`,
		);
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_REVIEWERS_UNIQUE)}`,
		);
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_WORKFLOW_ID)}`,
		);
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_VERSION)}`,
		);
		await runQuery(
			`DROP INDEX IF EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_UNIQUE)}`,
		);

		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(IDX_REQUEST_OPEN_PROJECT_CREATED)}`);
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName(IDX_REQUEST_PROJECT_STATUS_CREATED)}`);

		await dropTable(AUTHOR_TABLE);
		await dropTable(REVIEWER_TABLE);
		await dropTable(WORKFLOW_TABLE);
		await dropTable(REQUEST_TABLE);
	}

	private async createRequestTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(REQUEST_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('projectId').varchar(36).notNull,
				column('status')
					.varchar(50)
					.notNull.default("'pending'")
					.withEnumCheck(['pending', 'changes_requested', 'approved'])
					.comment('Review lifecycle status'),
				column('title').varchar(512).notNull,
				column('description').text,
				column('createdById').uuid,
				column('updatedById').uuid,
				column('archivedById').uuid,
				column('archivedAt').timestampTimezone(),
				column('publishError').text.comment('Last auto-publish failure message'),
				column('publishErrorAt')
					.timestampTimezone()
					.comment('When publishError was set; cleared on success'),
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
			.withForeignKey('archivedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	private async createWorkflowChildTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(WORKFLOW_TABLE)
			.withColumns(
				column('id').varchar(36).primary.notNull,
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
				column('id').varchar(36).primary.notNull,
				column('workflowReviewRequestId').varchar(36).notNull,
				column('userId').uuid.notNull,
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
				column('id').varchar(36).primary.notNull,
				column('workflowReviewRequestId').varchar(36).notNull,
				column('userId').uuid.notNull,
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

	private async createChildReviewerAndAuthorIndexes({ runQuery, escape }: MigrationContext) {
		const workflowTable = escape.tableName(WORKFLOW_TABLE);
		const reviewerTable = escape.tableName(REVIEWER_TABLE);
		const authorTable = escape.tableName(AUTHOR_TABLE);
		const requestIdColumn = escape.columnName('workflowReviewRequestId');
		const workflowIdColumn = escape.columnName('workflowId');
		const workflowVersionIdColumn = escape.columnName('workflowVersionId');
		const userIdColumn = escape.columnName('userId');

		await runQuery(
			`CREATE UNIQUE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_UNIQUE)}
			ON ${workflowTable}(${requestIdColumn}, ${workflowIdColumn})`,
		);
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_VERSION)}
			ON ${workflowTable}(${workflowIdColumn}, ${workflowVersionIdColumn})
			WHERE ${workflowVersionIdColumn} IS NOT NULL`,
		);
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_WORKFLOW_WORKFLOW_ID)}
			ON ${workflowTable}(${workflowIdColumn})`,
		);
		await runQuery(
			`CREATE UNIQUE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_REVIEWERS_UNIQUE)}
			ON ${reviewerTable}(${requestIdColumn}, ${userIdColumn})`,
		);
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_REVIEWERS_USER_ID)}
			ON ${reviewerTable}(${userIdColumn})`,
		);
		await runQuery(
			`CREATE UNIQUE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_AUTHORS_UNIQUE)}
			ON ${authorTable}(${requestIdColumn}, ${userIdColumn})`,
		);
		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_WORKFLOW_REQUEST_AUTHORS_USER_ID)}
			ON ${authorTable}(${userIdColumn})`,
		);
	}

	private async createRequestIndexes({ runQuery, escape }: MigrationContext) {
		const requestTable = escape.tableName(REQUEST_TABLE);
		const projectIdColumn = escape.columnName('projectId');
		const statusColumn = escape.columnName('status');
		const createdAtColumn = escape.columnName('createdAt');
		const archivedAtColumn = escape.columnName('archivedAt');

		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_REQUEST_PROJECT_STATUS_CREATED)}
			ON ${requestTable}(${projectIdColumn}, ${statusColumn}, ${createdAtColumn} DESC)`,
		);

		await runQuery(
			`CREATE INDEX IF NOT EXISTS ${escape.indexName(IDX_REQUEST_OPEN_PROJECT_CREATED)}
			ON ${requestTable}(${projectIdColumn}, ${createdAtColumn} DESC)
			WHERE ${statusColumn} IN ('pending', 'changes_requested') AND ${archivedAtColumn} IS NULL`,
		);
	}
}
