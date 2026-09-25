import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateWorkflowReviewRequestTables1784000000052';

describe('CreateWorkflowReviewRequestTables Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function indexExists(context: TestMigrationContext, name: string): Promise<boolean> {
		if (context.isSqlite) {
			const rows = await context.runQuery<Array<{ name: string }>>(
				"SELECT name FROM sqlite_master WHERE type = 'index' AND name = :name",
				{ name },
			);
			return rows.length === 1;
		}
		const rows = await context.runQuery<Array<{ indexname: string }>>(
			'SELECT indexname FROM pg_indexes WHERE indexname = :name',
			{ name },
		);
		return rows.length === 1;
	}

	async function seedProject(context: TestMigrationContext): Promise<string> {
		const projectId = generateNanoId();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id: projectId,
				name: `Review test project ${projectId}`,
				type: 'team',
				createdAt: now,
				updatedAt: now,
			},
		);
		return projectId;
	}

	async function seedWorkflow(
		context: TestMigrationContext,
		projectId: string,
	): Promise<{ workflowId: string; versionId: string }> {
		const workflowId = generateNanoId();
		const versionId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_entity')} ("id", "name", "active", "nodes", "connections", "triggerCount", "versionId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :active, :nodes, :connections, :triggerCount, :versionId, :createdAt, :updatedAt)`,
			{
				id: workflowId,
				name: `Review test workflow ${workflowId}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				triggerCount: 0,
				versionId,
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('shared_workflow')} ("workflowId", "projectId", "role", "createdAt", "updatedAt")
			 VALUES (:workflowId, :projectId, :role, :createdAt, :updatedAt)`,
			{
				workflowId,
				projectId,
				role: 'workflow:owner',
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_history')} ("versionId", "workflowId", "nodes", "connections", "authors", "createdAt", "updatedAt")
			 VALUES (:versionId, :workflowId, :nodes, :connections, :authors, :createdAt, :updatedAt)`,
			{
				versionId,
				workflowId,
				nodes: '[]',
				connections: '{}',
				authors: 'test',
				createdAt: now,
				updatedAt: now,
			},
		);
		return { workflowId, versionId };
	}

	it('creates the workflow review tables', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const requestTable = context.escape.tableName('workflow_review_request');
			const workflowTable = context.escape.tableName('workflow_review_request_workflow');
			const reviewerTable = context.escape.tableName('workflow_review_request_reviewers');
			const authorTable = context.escape.tableName('workflow_review_request_authors');

			const requestExists = await context.runQuery<Array<{ name: string }>>(
				context.isSqlite
					? "SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name"
					: 'SELECT tablename AS name FROM pg_tables WHERE tablename = :name',
				{ name: requestTable.replace(/"/g, '') },
			);
			expect(requestExists.length).toBe(1);

			const workflowExists = await context.runQuery<Array<{ name: string }>>(
				context.isSqlite
					? "SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name"
					: 'SELECT tablename AS name FROM pg_tables WHERE tablename = :name',
				{ name: workflowTable.replace(/"/g, '') },
			);
			expect(workflowExists.length).toBe(1);

			const reviewerExists = await context.runQuery<Array<{ name: string }>>(
				context.isSqlite
					? "SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name"
					: 'SELECT tablename AS name FROM pg_tables WHERE tablename = :name',
				{ name: reviewerTable.replace(/"/g, '') },
			);
			expect(reviewerExists.length).toBe(1);

			const authorExists = await context.runQuery<Array<{ name: string }>>(
				context.isSqlite
					? "SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name"
					: 'SELECT tablename AS name FROM pg_tables WHERE tablename = :name',
				{ name: authorTable.replace(/"/g, '') },
			);
			expect(authorExists.length).toBe(1);
		} finally {
			await context.queryRunner.release();
		}
	});

	it('creates the expected indexes', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const prefix = context.tablePrefix;

			expect(
				await indexExists(context, `UQ_${prefix}workflow_review_request_workflow_request_workflow`),
			).toBe(true);
			expect(
				await indexExists(
					context,
					`IDX_${prefix}workflow_review_request_workflow_workflow_request`,
				),
			).toBe(true);
			expect(await indexExists(context, `IDX_${prefix}workflow_review_request_project_state`)).toBe(
				true,
			);
			expect(
				await indexExists(context, `IDX_${prefix}workflow_review_request_reviewers_user`),
			).toBe(true);
		} finally {
			await context.queryRunner.release();
		}
	});

	it('supports creating and reading review request rows', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const projectId = await seedProject(context);
			const { workflowId, versionId } = await seedWorkflow(context, projectId);
			const requestId = generateNanoId();
			const childId = generateNanoId();
			const userId = randomUUID();
			const now = new Date();

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('user')} ("id", "email", "firstName", "lastName", "password", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :createdAt, :updatedAt)`,
				{
					id: userId,
					email: `${userId}@example.com`,
					firstName: 'Review',
					lastName: 'Tester',
					password: 'hashed',
					createdAt: now,
					updatedAt: now,
				},
			);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_review_request')}
			 ("id", "projectId", "state", "decision", "title", "description", "createdById", "updatedById", "createdAt", "updatedAt")
			 VALUES (:id, :projectId, :state, :decision, :title, :description, :createdById, :updatedById, :createdAt, :updatedAt)`,
				{
					id: requestId,
					projectId,
					state: 'open',
					decision: 'pending',
					title: 'Test review',
					description: 'Optional description',
					createdById: userId,
					updatedById: userId,
					createdAt: now,
					updatedAt: now,
				},
			);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_review_request_workflow')}
			 ("id", "workflowReviewRequestId", "workflowId", "workflowVersionId")
			 VALUES (:id, :workflowReviewRequestId, :workflowId, :workflowVersionId)`,
				{
					id: childId,
					workflowReviewRequestId: requestId,
					workflowId,
					workflowVersionId: versionId,
				},
			);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_review_request_reviewers')}
			 ("workflowReviewRequestId", "userId")
			 VALUES (:workflowReviewRequestId, :userId)`,
				{
					workflowReviewRequestId: requestId,
					userId,
				},
			);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_review_request_authors')}
			 ("workflowReviewRequestId", "userId")
			 VALUES (:workflowReviewRequestId, :userId)`,
				{
					workflowReviewRequestId: requestId,
					userId,
				},
			);

			const [request] = await context.runQuery<
				Array<{ id: string; state: string; decision: string }>
			>(
				`SELECT "id", "state", "decision" FROM ${context.escape.tableName('workflow_review_request')} WHERE "id" = :id`,
				{ id: requestId },
			);
			expect(request).toEqual({ id: requestId, state: 'open', decision: 'pending' });

			const childRows = await context.runQuery<Array<{ workflowId: string }>>(
				`SELECT "workflowId" FROM ${context.escape.tableName('workflow_review_request_workflow')} WHERE "workflowReviewRequestId" = :requestId`,
				{ requestId },
			);
			expect(childRows).toEqual([{ workflowId }]);

			const reviewerRows = await context.runQuery<Array<{ userId: string }>>(
				`SELECT "userId" FROM ${context.escape.tableName('workflow_review_request_reviewers')} WHERE "workflowReviewRequestId" = :requestId`,
				{ requestId },
			);
			expect(reviewerRows).toEqual([{ userId }]);

			const authorRows = await context.runQuery<Array<{ userId: string }>>(
				`SELECT "userId" FROM ${context.escape.tableName('workflow_review_request_authors')} WHERE "workflowReviewRequestId" = :requestId`,
				{ requestId },
			);
			expect(authorRows).toEqual([{ userId }]);
		} finally {
			await context.queryRunner.release();
		}
	});

	it('cascades child, reviewer, and author rows when the parent request is deleted', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			const projectId = await seedProject(context);
			const { workflowId, versionId } = await seedWorkflow(context, projectId);
			const requestId = generateNanoId();
			const now = new Date();

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_review_request')}
			 ("id", "projectId", "state", "decision", "title", "createdAt", "updatedAt")
			 VALUES (:id, :projectId, :state, :decision, :title, :createdAt, :updatedAt)`,
				{
					id: requestId,
					projectId,
					state: 'open',
					decision: 'pending',
					title: 'Cascade test',
					createdAt: now,
					updatedAt: now,
				},
			);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('workflow_review_request_workflow')}
			 ("id", "workflowReviewRequestId", "workflowId", "workflowVersionId")
			 VALUES (:id, :workflowReviewRequestId, :workflowId, :workflowVersionId)`,
				{
					id: generateNanoId(),
					workflowReviewRequestId: requestId,
					workflowId,
					workflowVersionId: versionId,
				},
			);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('workflow_review_request')} WHERE "id" = :id`,
				{ id: requestId },
			);

			const childRows = await context.runQuery<unknown[]>(
				`SELECT "id" FROM ${context.escape.tableName('workflow_review_request_workflow')} WHERE "workflowReviewRequestId" = :requestId`,
				{ requestId },
			);
			expect(childRows).toHaveLength(0);

			const authorRows = await context.runQuery<unknown[]>(
				`SELECT "userId" FROM ${context.escape.tableName('workflow_review_request_authors')} WHERE "workflowReviewRequestId" = :requestId`,
				{ requestId },
			);
			expect(authorRows).toHaveLength(0);
		} finally {
			await context.queryRunner.release();
		}
	});
});
