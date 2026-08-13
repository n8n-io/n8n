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

const MIGRATION_NAME = 'CreateWorkflowReviewActivityTablesAndBaseline1785843640527';

const ACTIVITY_TABLE = 'workflow_review_activity';
const COMMENT_TABLE = 'workflow_review_activity_comment';
const REQUEST_WORKFLOW_TABLE = 'workflow_review_request_workflow';
const BASELINE_VERSION_COLUMN = 'baselineVersionId';
const BASELINE_VERSION_FK = 'FK_workflow_review_request_workflow_baselineVersionId';
const AUTHORS_TABLE = 'workflow_review_request_authors';
const AUTHORS_USER_INDEX_SUFFIX = 'workflow_review_request_authors_user';

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

async function columnMeta(
	context: TestMigrationContext,
	table: string,
	columnName: string,
): Promise<{ nullable: boolean } | undefined> {
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string; notnull: number }>>(
			`PRAGMA table_info(${context.escape.tableName(table)})`,
		);
		const row = rows.find(({ name }) => name === columnName);
		return row && { nullable: Number(row.notnull) === 0 };
	}
	const rows = await context.runQuery<Array<{ is_nullable: string }>>(
		`SELECT is_nullable FROM information_schema.columns
		 WHERE table_name = :tableName AND column_name = :columnName`,
		{ tableName: `${context.tablePrefix}${table}`, columnName },
	);
	return rows[0] && { nullable: rows[0].is_nullable === 'YES' };
}

async function indexExists(
	context: TestMigrationContext,
	table: string,
	indexNameSuffix: string,
): Promise<boolean> {
	// The DSL composes a custom index name as `IDX_<prefix><name>`, prefix in the middle, so a
	// plain `<prefix><name>` misses it on the Postgres leg, which runs with DB_TABLE_PREFIX.
	const name = `IDX_${context.tablePrefix}${indexNameSuffix}`;
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type = 'index' AND name = :name",
			{ name },
		);
		return rows.length > 0;
	}
	const rows = await context.runQuery<Array<{ indexname: string }>>(
		'SELECT indexname FROM pg_indexes WHERE tablename = :tableName AND indexname = :name',
		{ tableName: `${context.tablePrefix}${table}`, name },
	);
	return rows.length > 0;
}

async function foreignKeyNames(
	context: TestMigrationContext,
	table: string,
	columnName: string,
): Promise<string[]> {
	if (context.isSqlite) {
		const [{ sql }] = await context.runQuery<Array<{ sql: string }>>(
			"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = :name",
			{ name: `${context.tablePrefix}${table}` },
		);
		const pattern = new RegExp(`CONSTRAINT "([^"]+)" FOREIGN KEY \\("${columnName}"\\)`, 'g');
		return [...sql.matchAll(pattern)].map(([, name]) => name);
	}
	const rows = await context.runQuery<Array<{ constraintName: string }>>(
		`SELECT tc.constraint_name AS ${context.escape.columnName('constraintName')}
		 FROM information_schema.table_constraints tc
		 JOIN information_schema.key_column_usage kcu
		   ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
		 WHERE tc.table_name = :tableName
		   AND tc.constraint_type = 'FOREIGN KEY'
		   AND kcu.column_name = :columnName`,
		{ tableName: `${context.tablePrefix}${table}`, columnName },
	);
	return rows.map((row) => row.constraintName);
}

describe('CreateWorkflowReviewActivityTablesAndBaseline Migration', () => {
	let dataSource: DataSource;
	/** Seeded before the migration runs, so the column add has existing data to preserve. */
	let preExistingLinkRowId: string;

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

		const seedContext = createTestMigrationContext(dataSource);
		try {
			preExistingLinkRowId = await seedLinkedWorkflowRow(seedContext);
		} finally {
			await seedContext.queryRunner.release();
		}
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
			createdById?: string;
			workflowId?: string;
		},
	): Promise<number> {
		const activityTable = context.escape.tableName(ACTIVITY_TABLE);
		await context.runQuery(
			`INSERT INTO ${activityTable} ("workflowReviewRequestId", "type", "createdById", "workflowId", "createdAt")
			 VALUES (:workflowReviewRequestId, :type, :createdById, :workflowId, :createdAt)`,
			{
				workflowReviewRequestId: fields.workflowReviewRequestId,
				type: fields.type ?? 'review.opened',
				createdById: fields.createdById ?? null,
				workflowId: fields.workflowId ?? null,
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

	/**
	 * A `workflow_review_request_workflow` row in its pre-migration shape. Adding a column to that
	 * table recreates it on SQLite, so this is the data the recreate has to carry across.
	 */
	async function seedLinkedWorkflowRow(context: TestMigrationContext): Promise<string> {
		const rowId = generateNanoId();
		const requestId = await seedRequest(context);
		const workflowId = await seedWorkflow(context);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(REQUEST_WORKFLOW_TABLE)}
			 ("id", "workflowReviewRequestId", "workflowId", "workflowVersionId")
			 VALUES (:id, :requestId, :workflowId, :versionId)`,
			{ id: rowId, requestId, workflowId, versionId: null },
		);
		return rowId;
	}

	async function seedWorkflow(context: TestMigrationContext): Promise<string> {
		const workflowId = generateNanoId();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('workflow_entity')}
			 ("id", "name", "active", "nodes", "connections", "versionId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :active, :nodes, :connections, :versionId, :createdAt, :updatedAt)`,
			{
				id: workflowId,
				name: `Activity test workflow ${workflowId}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				versionId: randomUUID(),
				createdAt: now,
				updatedAt: now,
			},
		);
		return workflowId;
	}

	async function insertComment(
		context: TestMigrationContext,
		activityId: number | null,
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
			const history = [{ body: 'First draft', editedAt: '2026-01-02T03:04:05.678Z' }];
			const editedAt = new Date('2026-01-02T03:04:05.678Z');
			const savedSubmission = await activityRepository.save(
				activityRepository.create({
					workflowReviewRequestId: requestId,
					type: 'review.opened',
					data,
				}),
			);
			const savedThread = await activityRepository.save(
				activityRepository.create({ workflowReviewRequestId: requestId, type: 'comment.created' }),
			);
			const savedMessage = await commentRepository.save(
				commentRepository.create({
					activityId: savedThread.id,
					body: 'Looks good',
					history,
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
			expect(submission.type).toBe('review.opened');
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
			expect(message.history).toEqual(history);
			expect(message.updatedAt).toEqual(editedAt);
			expect(message.deletedAt).toBeNull();
			expect(message.createdAt).toBeInstanceOf(Date);
			expect(message.createdById).toBeNull();
			expect(reply.createdById).toBe(userId);
		});

		it('rejects a comment with no activityId and an activity with an unknown type', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				// SQLite says "NOT NULL constraint failed", Postgres "violates not-null constraint".
				await expect(insertComment(context, null)).rejects.toThrow(/not[- ]null constraint/i);

				// SQLite says "CHECK constraint failed", Postgres "violates check constraint".
				const requestId = await seedRequest(context);
				await expect(
					insertActivity(context, { workflowReviewRequestId: requestId, type: 'nonsense' }),
				).rejects.toThrow(/check constraint/i);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('removes activity and comment rows when the review request is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const activityId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					type: 'comment.created',
				});
				await insertComment(context, activityId);

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName('workflow_review_request')} WHERE "id" = :id`,
					{ id: requestId },
				);

				// Both hops of request -> activity -> comment.
				const activityRows = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "id" = :id`,
					{ id: activityId },
				);
				const commentRows = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${context.escape.tableName(COMMENT_TABLE)} WHERE "activityId" = :id`,
					{ id: activityId },
				);
				expect(activityRows).toHaveLength(0);
				expect(commentRows).toHaveLength(0);
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
					type: 'comment.created',
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
					type: 'comment.created',
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

		it('keeps rows that already existed in the table it adds the column to', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const rows = await context.runQuery<Array<{ baselineVersionId: string | null }>>(
					`SELECT "baselineVersionId" FROM ${context.escape.tableName(REQUEST_WORKFLOW_TABLE)} WHERE "id" = :id`,
					{ id: preExistingLinkRowId },
				);
				expect(rows).toEqual([{ baselineVersionId: null }]);
			} finally {
				await context.queryRunner.release();
			}
		});

		it('adds baselineVersionId as nullable so reviews closed before this migration stay valid', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				expect(await columnMeta(context, REQUEST_WORKFLOW_TABLE, BASELINE_VERSION_COLUMN)).toEqual({
					nullable: true,
				});
			} finally {
				await context.queryRunner.release();
			}
		});

		// The whole reason `workflowId` is CASCADE and not SET NULL: NULL marks a review-level
		// entry, so nulling on delete would widen a workflow-scoped entry to everyone who can
		// read the review.
		it('drops entries about a deleted workflow and keeps the review-level ones', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				const workflowId = await seedWorkflow(context);
				const scopedId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					type: 'workflow.published',
					workflowId,
				});
				const reviewLevelId = await insertActivity(context, {
					workflowReviewRequestId: requestId,
					type: 'comment.created',
				});
				await insertComment(context, reviewLevelId);

				await context.runQuery(
					`DELETE FROM ${context.escape.tableName('workflow_entity')} WHERE "id" = :id`,
					{ id: workflowId },
				);

				const remaining = await context.runQuery<Array<{ id: number }>>(
					`SELECT "id" FROM ${context.escape.tableName(ACTIVITY_TABLE)} WHERE "workflowReviewRequestId" = :requestId`,
					{ requestId },
				);
				expect(remaining.map(({ id }) => Number(id))).toEqual([reviewLevelId]);
				expect(remaining.map(({ id }) => Number(id))).not.toContain(scopedId);

				// The comment on the surviving entry rides its parent, so it stays too.
				const commentRows = await context.runQuery<unknown[]>(
					`SELECT "id" FROM ${context.escape.tableName(COMMENT_TABLE)} WHERE "activityId" = :id`,
					{ id: reviewLevelId },
				);
				expect(commentRows).toHaveLength(1);
			} finally {
				await context.queryRunner.release();
			}
		});

		// The authors table ships in an earlier migration, so this index is created here and has
		// to be dropped explicitly in `down()`; nothing else removes it.
		it('indexes the authors table by user', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				expect(await indexExists(context, AUTHORS_TABLE, AUTHORS_USER_INDEX_SUFFIX)).toBe(true);
			} finally {
				await context.queryRunner.release();
			}
		});

		// The name is what makes `down()` deterministic: SQLite drops a foreign key by matching the
		// constraint name, and an auto-generated one never matches what the DSL passes in.
		it('names the baseline foreign key explicitly', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				expect(
					await foreignKeyNames(context, REQUEST_WORKFLOW_TABLE, BASELINE_VERSION_COLUMN),
				).toEqual([BASELINE_VERSION_FK]);
			} finally {
				await context.queryRunner.release();
			}
		});
	});

	describe('down', () => {
		// The drop order only matters on Postgres: the SQLite query runner disables foreign keys
		// for every migration run, so a wrong order would still pass on that leg.
		it('drops both tables and the baseline column', async () => {
			// Assert the precondition inside this test, not in the `up` block: under a filtered run
			// (`vitest -t`) the `up` hook is skipped, so without this the test would revert whatever
			// migration preceded ours and pass by finding tables that never existed.
			const before = createTestMigrationContext(dataSource);
			try {
				expect(await tableExists(before, ACTIVITY_TABLE)).toBe(true);
				expect(await tableExists(before, COMMENT_TABLE)).toBe(true);
				expect(
					await columnMeta(before, REQUEST_WORKFLOW_TABLE, BASELINE_VERSION_COLUMN),
				).toBeDefined();
				expect(await indexExists(before, AUTHORS_TABLE, AUTHORS_USER_INDEX_SUFFIX)).toBe(true);
			} finally {
				// Release before reverting: holding a pooled lease across the revert exhausts the
				// Postgres pool and the migration times out trying to connect.
				await before.queryRunner.release();
			}

			await undoLastSingleMigration();

			const after = createTestMigrationContext(dataSource);
			try {
				expect(await tableExists(after, ACTIVITY_TABLE)).toBe(false);
				expect(await tableExists(after, COMMENT_TABLE)).toBe(false);
				expect(
					await columnMeta(after, REQUEST_WORKFLOW_TABLE, BASELINE_VERSION_COLUMN),
				).toBeUndefined();
				// The authors table survives the revert, so a missed dropIndex would leave this behind.
				expect(await indexExists(after, AUTHORS_TABLE, AUTHORS_USER_INDEX_SUFFIX)).toBe(false);
			} finally {
				await after.queryRunner.release();
			}
		});
	});
});
