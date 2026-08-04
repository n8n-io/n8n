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
		fields: {
			workflowReviewRequestId: string;
			type?: string;
			groupId?: number;
			createdById?: string;
		},
	): Promise<number> {
		const activityTable = context.escape.tableName(ACTIVITY_TABLE);
		await context.runQuery(
			`INSERT INTO ${activityTable} ("workflowReviewRequestId", "type", "groupId", "createdById", "createdAt")
			 VALUES (:workflowReviewRequestId, :type, :groupId, :createdById, :createdAt)`,
			{
				workflowReviewRequestId: fields.workflowReviewRequestId,
				type: fields.type ?? 'submitted',
				groupId: fields.groupId ?? null,
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

	async function insertComment(context: TestMigrationContext, activityId: number): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(COMMENT_TABLE)} ("activityId", "body", "createdAt")
			 VALUES (:activityId, :body, :createdAt)`,
			{ activityId, body: 'Comment body', createdAt: new Date() },
		);
	}

	describe('up', () => {
		beforeAll(async () => {
			await runSingleMigration(MIGRATION_NAME);
		});

		it('creates the feed index and the partial groupId index', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const prefix = context.tablePrefix;
				expect(await indexExists(context, `IDX_${prefix}workflow_review_activity_request`)).toBe(
					true,
				);
				expect(await indexExists(context, `IDX_${prefix}workflow_review_activity_group`)).toBe(
					true,
				);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('round-trips an activity and its comment through the entities', async () => {
			const context = createTestMigrationContext(dataSource);
			let requestId: string;
			try {
				requestId = await seedRequest(context);
			} finally {
				await context.queryRunner.release();
			}

			const activityRepository = dataSource.getRepository(WorkflowReviewActivity);
			const commentRepository = dataSource.getRepository(WorkflowReviewActivityComment);

			const data = { workflowId: 'wf-1', versionId: 'v-1' };
			const commentData = { revisions: [{ body: 'First draft' }] };
			const editedAt = new Date('2026-01-02T03:04:05.678Z');
			const savedFirst = await activityRepository.save(
				activityRepository.create({ workflowReviewRequestId: requestId, type: 'submitted', data }),
			);
			const savedSecond = await activityRepository.save(
				activityRepository.create({ workflowReviewRequestId: requestId, type: 'comment' }),
			);
			await commentRepository.save(
				commentRepository.create({
					activityId: savedSecond.id,
					body: 'Looks good',
					data: commentData,
					updatedAt: editedAt,
				}),
			);

			// Assert on freshly loaded rows only: what `save()` returns is partly the in-memory
			// object, so unset columns read back as `undefined` and `data` is the very object passed in.
			const first = await activityRepository.findOneByOrFail({ id: savedFirst.id });
			const second = await activityRepository.findOneByOrFail({ id: savedSecond.id });
			const comment = await commentRepository.findOneByOrFail({ activityId: savedSecond.id });

			expect(typeof first.id).toBe('number');
			expect(second.id).toBeGreaterThan(first.id);
			expect(first.type).toBe('submitted');
			expect(first.typeVersion).toBe(1);
			expect(first.data).toEqual(data);
			expect(first.groupId).toBeNull();
			expect(first.createdById).toBeNull();
			expect(first.createdAt).toBeInstanceOf(Date);
			expect(second.data).toBeNull();

			expect(comment.body).toBe('Looks good');
			expect(comment.data).toEqual(commentData);
			expect(comment.updatedAt).toEqual(editedAt);
			expect(comment.deletedAt).toBeNull();
			expect(comment.createdAt).toBeInstanceOf(Date);
		});

		it('rejects an activity whose groupId has no parent row', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);

				// Offset well past the current max rather than max + 1: both engines hand out max + 1
				// next (SQLite via the rowid alias, Postgres via the identity sequence) and the FK is
				// checked after the row is written, so the new row would satisfy the FK with itself.
				const orphanGroupId = (await maxActivityId(context)) + 1000;

				await expect(
					insertActivity(context, { workflowReviewRequestId: requestId, groupId: orphanGroupId }),
				).rejects.toThrow(/foreign key constraint/i);
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

		it('removes a reply and its comment row when the parent activity is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const parentId = await insertActivity(context, { workflowReviewRequestId: requestId });
				const replyId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					type: 'comment',
					groupId: parentId,
				});
				await insertComment(context, replyId);

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: parentId },
				);

				const replies = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: replyId },
				);
				const comments = await context.runQuery<unknown[]>(
					`SELECT "activityId" FROM ${context.escape.tableName(COMMENT_TABLE)} WHERE "activityId" = :id`,
					{ id: replyId },
				);
				expect(replies).toHaveLength(0);
				expect(comments).toHaveLength(0);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('keeps activity rows and nulls createdById when the author is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const userId = await seedUser(context);
				const activityId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					createdById: userId,
				});

				await context.runQuery(`DELETE FROM ${context.escape.tableName('user')} WHERE "id" = :id`, {
					id: userId,
				});

				const rows = await context.runQuery<Array<{ createdById: string | null }>>(
					`SELECT "createdById" FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: activityId },
				);
				expect(rows).toEqual([{ createdById: null }]);
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
				expect(await indexExists(context, `IDX_${prefix}workflow_review_activity_group`)).toBe(
					false,
				);
			} finally {
				await context.queryRunner.release();
			}
		});
	});
});
