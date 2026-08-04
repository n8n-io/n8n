import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection, WorkflowReviewActivity, WorkflowReviewActivityComment } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateWorkflowReviewActivityTables1785843640527';

const ACTIVITY_TABLE = 'workflow_review_activity';
const COMMENT_TABLE = 'workflow_review_activity_comment';

async function tableExists(context: TestMigrationContext, table: string): Promise<boolean> {
	const name = `${context.tablePrefix}${table}`;
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name",
			{ name },
		);
		return rows.length > 0;
	}
	const rows = await context.runQuery<Array<{ tablename: string }>>(
		'SELECT tablename FROM pg_tables WHERE tablename = :name',
		{ name },
	);
	return rows.length > 0;
}

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

describe('CreateWorkflowReviewActivityTables Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const context = createTestMigrationContext(dataSource);
		try {
			await context.queryRunner.clearDatabase();
		} finally {
			await context.queryRunner.release();
		}

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function seedUser(context: TestMigrationContext): Promise<string> {
		const userId = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('user')} ("id", "email", "firstName", "lastName", "password", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :createdAt, :updatedAt)`,
			{
				id: userId,
				email: `${userId}@example.com`,
				firstName: 'Activity',
				lastName: 'Tester',
				password: 'hashed',
				createdAt: now,
				updatedAt: now,
			},
		);
		return userId;
	}

	async function seedRequest(context: TestMigrationContext): Promise<string> {
		const projectId = generateNanoId();
		const requestId = generateNanoId();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id: projectId,
				name: `Activity test project ${projectId}`,
				type: 'team',
				createdAt: now,
				updatedAt: now,
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_review_request')}
			 ("id", "projectId", "state", "decision", "title", "createdAt", "updatedAt")
			 VALUES (:id, :projectId, :state, :decision, :title, :createdAt, :updatedAt)`,
			{
				id: requestId,
				projectId,
				state: 'open',
				decision: 'pending',
				title: 'Activity test review',
				createdAt: now,
				updatedAt: now,
			},
		);
		return requestId;
	}

	/**
	 * Inserts an activity row without an `id` and reads the assigned one back as the table max.
	 * Safe because this suite runs single-fork with no file parallelism. `INSERT ... RETURNING`
	 * is not portable here: the SQLite pooled driver replaces the result of any INSERT with
	 * `lastID`, where Postgres returns rows.
	 */
	async function insertActivity(
		context: TestMigrationContext,
		fields: { workflowReviewRequestId: string; type?: string; createdById?: string },
	): Promise<number> {
		const activityTable = context.escape.tableName(ACTIVITY_TABLE);
		await context.runQuery(
			`INSERT INTO ${activityTable} ("workflowReviewRequestId", "type", "createdById", "createdAt")
			 VALUES (:workflowReviewRequestId, :type, :createdById, :createdAt)`,
			{
				workflowReviewRequestId: fields.workflowReviewRequestId,
				type: fields.type ?? 'submitted',
				createdById: fields.createdById ?? null,
				createdAt: new Date(),
			},
		);
		return await maxActivityId(context);
	}

	async function maxActivityId(context: TestMigrationContext): Promise<number> {
		const [{ maxId }] = await context.runQuery<Array<{ maxId: number | null }>>(
			`SELECT MAX("id") AS "maxId" FROM ${context.escape.tableName(ACTIVITY_TABLE)}`,
		);
		return maxId ?? 0;
	}

	async function insertComment(
		context: TestMigrationContext,
		activityId: number,
		createdById?: string,
	): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(COMMENT_TABLE)} ("activityId", "createdById", "body", "createdAt")
			 VALUES (:activityId, :createdById, :body, :createdAt)`,
			{
				activityId,
				createdById: createdById ?? null,
				body: 'Comment body',
				createdAt: new Date(),
			},
		);
	}

	describe('up', () => {
		beforeAll(async () => {
			await runSingleMigration(MIGRATION_NAME);
		});

		it('creates the feed index and the thread index', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const prefix = context.tablePrefix;
				expect(await indexExists(context, `IDX_${prefix}workflow_review_activity_request`)).toBe(
					true,
				);
				expect(
					await indexExists(context, `IDX_${prefix}workflow_review_activity_comment_activity`),
				).toBe(true);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('round-trips an activity and its comment thread through the entities', async () => {
			const context = createTestMigrationContext(dataSource);
			let requestId: string;
			let userId: string;
			try {
				requestId = await seedRequest(context);
				userId = await seedUser(context);
			} finally {
				await context.queryRunner.release();
			}

			const activityRepository = dataSource.getRepository(WorkflowReviewActivity);
			const commentRepository = dataSource.getRepository(WorkflowReviewActivityComment);

			const data = { workflowId: 'wf-1', versionId: 'v-1' };
			const commentData = { revisions: [{ body: 'First draft' }] };
			const editedAt = new Date('2026-01-02T03:04:05.678Z');
			const savedSubmission = await activityRepository.save(
				activityRepository.create({ workflowReviewRequestId: requestId, type: 'submitted', data }),
			);
			const savedThread = await activityRepository.save(
				activityRepository.create({ workflowReviewRequestId: requestId, type: 'comment' }),
			);
			const savedMessage = await commentRepository.save(
				commentRepository.create({
					activityId: savedThread.id,
					body: 'Looks good',
					data: commentData,
					updatedAt: editedAt,
				}),
			);
			const savedReply = await commentRepository.save(
				commentRepository.create({
					activityId: savedThread.id,
					body: 'Agreed',
					createdById: userId,
				}),
			);

			// Assert on freshly loaded rows only: what `save()` returns is partly the in-memory
			// object, so unset columns read back as `undefined` and `data` is the very object passed in.
			const submission = await activityRepository.findOneByOrFail({ id: savedSubmission.id });
			const thread = await activityRepository.findOneByOrFail({ id: savedThread.id });
			const message = await commentRepository.findOneByOrFail({ id: savedMessage.id });
			const reply = await commentRepository.findOneByOrFail({ id: savedReply.id });

			expect(typeof submission.id).toBe('number');
			expect(thread.id).toBeGreaterThan(submission.id);
			expect(submission.type).toBe('submitted');
			expect(submission.typeVersion).toBe(1);
			expect(submission.data).toEqual(data);
			expect(submission.createdById).toBeNull();
			expect(submission.createdAt).toBeInstanceOf(Date);
			expect(thread.data).toBeNull();

			// One activity row owns many message rows, ordered by their own id.
			expect(message.activityId).toBe(thread.id);
			expect(reply.activityId).toBe(thread.id);
			expect(reply.id).toBeGreaterThan(message.id);

			expect(message.body).toBe('Looks good');
			expect(message.data).toEqual(commentData);
			expect(message.updatedAt).toEqual(editedAt);
			expect(message.deletedAt).toBeNull();
			expect(message.createdAt).toBeInstanceOf(Date);
			expect(message.createdById).toBeNull();
			expect(reply.createdById).toBe(userId);
		});

		it('rejects a comment whose activityId has no parent row', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				// Well past the current max, so no activity row in this suite can carry this id.
				const orphanActivityId = (await maxActivityId(context)) + 1000;

				await expect(insertComment(context, orphanActivityId)).rejects.toThrow(
					/foreign key constraint/i,
				);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('removes activity rows when the review request is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const activityId = await insertActivity(context, { workflowReviewRequestId: requestId });

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName('workflow_review_request')} WHERE "id" = :id`,
					{ id: requestId },
				);

				const rows = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: activityId },
				);
				expect(rows).toHaveLength(0);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('removes every message in a thread when its activity row is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const activityId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					type: 'comment',
				});
				await insertComment(context, activityId);
				await insertComment(context, activityId);

				const commentsQuery = `SELECT "id" FROM ${context.escape.tableName(COMMENT_TABLE)} WHERE "activityId" = :id`;
				expect(await context.runQuery<unknown[]>(commentsQuery, { id: activityId })).toHaveLength(
					2,
				);

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: activityId },
				);

				expect(await context.runQuery<unknown[]>(commentsQuery, { id: activityId })).toHaveLength(
					0,
				);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('keeps activity and comment rows and nulls createdById when the author is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const userId = await seedUser(context);
				const activityId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					type: 'comment',
					createdById: userId,
				});
				await insertComment(context, activityId, userId);

				await context.runQuery(`DELETE FROM ${context.escape.tableName('user')} WHERE "id" = :id`, {
					id: userId,
				});

				const activityRows = await context.runQuery<Array<{ createdById: string | null }>>(
					`SELECT "createdById" FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: activityId },
				);
				const commentRows = await context.runQuery<Array<{ createdById: string | null }>>(
					`SELECT "createdById" FROM ${context.escape.tableName(COMMENT_TABLE)} WHERE "activityId" = :id`,
					{ id: activityId },
				);
				expect(activityRows).toEqual([{ createdById: null }]);
				expect(commentRows).toEqual([{ createdById: null }]);
			} finally {
				await context.queryRunner.release();
			}
		});
	});

	describe('down', () => {
		// The drop order only matters on Postgres: the SQLite query runner disables foreign keys
		// for every migration run, so a wrong order would still pass on that leg.
		it('drops both tables', async () => {
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			try {
				const prefix = context.tablePrefix;
				expect(await tableExists(context, ACTIVITY_TABLE)).toBe(false);
				expect(await tableExists(context, COMMENT_TABLE)).toBe(false);
				expect(await indexExists(context, `IDX_${prefix}workflow_review_activity_request`)).toBe(
					false,
				);
				expect(
					await indexExists(context, `IDX_${prefix}workflow_review_activity_comment_activity`),
				).toBe(false);
			} finally {
				await context.queryRunner.release();
			}
		});
	});
});
