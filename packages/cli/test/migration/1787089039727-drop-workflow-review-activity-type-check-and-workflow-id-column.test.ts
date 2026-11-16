import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn1787089039727';

const ACTIVITY_TABLE = 'workflow_review_activity';
const COMMENT_TABLE = 'workflow_review_activity_comment';
const WORKFLOW_COLUMN = 'workflowId';

/** Written by the feature only after this migration; the restored constraint rejects it. */
const NEW_TYPE = 'workflow.archived';

async function columnExists(
	context: TestMigrationContext,
	table: string,
	columnName: string,
): Promise<boolean> {
	if (context.isSqlite) {
		const rows = await context.runQuery<Array<{ name: string }>>(
			`PRAGMA table_info(${context.escape.tableName(table)})`,
		);
		return rows.some(({ name }) => name === columnName);
	}
	const rows = await context.runQuery<unknown[]>(
		`SELECT 1 FROM information_schema.columns
		 WHERE table_name = :tableName AND column_name = :columnName`,
		{ tableName: `${context.tablePrefix}${table}`, columnName },
	);
	return rows.length > 0;
}

describe('DropWorkflowReviewActivityTypeCheckAndWorkflowIdColumn Migration', () => {
	let dataSource: DataSource;
	/** Seeded before the migration runs, so the table recreation has rows to carry across. */
	let preExistingRequestId: string;
	let preExistingActivityId: number;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const clearContext = createTestMigrationContext(dataSource);
		try {
			await clearContext.queryRunner.clearDatabase();
		} finally {
			await clearContext.queryRunner.release();
		}

		await initDbUpToMigration(MIGRATION_NAME);

		const seedContext = createTestMigrationContext(dataSource);
		try {
			preExistingRequestId = await seedRequest(seedContext);
			preExistingActivityId = await insertActivity(seedContext, {
				workflowReviewRequestId: preExistingRequestId,
				type: 'comment.created',
			});
			await insertComment(seedContext, preExistingActivityId);
			await insertComment(seedContext, preExistingActivityId);
		} finally {
			await seedContext.queryRunner.release();
		}
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

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

	/**
	 * Inserts an activity row without an `id` and reads the assigned one back as the table max.
	 * Safe because this suite runs single-fork with no file parallelism. `INSERT ... RETURNING`
	 * is not portable here: the SQLite pooled driver replaces the result of any INSERT with
	 * `lastID`, where Postgres returns rows.
	 *
	 * `workflowId` is written through a dynamic column list because the column only exists on one
	 * side of this migration.
	 */
	async function insertActivity(
		context: TestMigrationContext,
		fields: {
			workflowReviewRequestId: string;
			type: string;
			workflowId?: string;
		},
	): Promise<number> {
		const columns = ['workflowReviewRequestId', 'type', 'createdAt'];
		if (fields.workflowId !== undefined) columns.push(WORKFLOW_COLUMN);

		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(ACTIVITY_TABLE)}
			 (${columns.map((name) => context.escape.columnName(name)).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			{
				workflowReviewRequestId: fields.workflowReviewRequestId,
				type: fields.type,
				createdAt: new Date(),
				...(fields.workflowId !== undefined ? { workflowId: fields.workflowId } : {}),
			},
		);

		const [{ maxId }] = await context.runQuery<Array<{ maxId: number | null }>>(
			`SELECT MAX("id") AS "maxId" FROM ${context.escape.tableName(ACTIVITY_TABLE)}`,
		);
		return Number(maxId);
	}

	async function insertComment(context: TestMigrationContext, activityId: number): Promise<void> {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(COMMENT_TABLE)} ("activityId", "body", "createdAt")
			 VALUES (:activityId, :body, :createdAt)`,
			{ activityId, body: 'Comment body', createdAt: new Date() },
		);
	}

	async function activityIdsOf(
		context: TestMigrationContext,
		requestId: string,
	): Promise<number[]> {
		const rows = await context.runQuery<Array<{ id: number }>>(
			`SELECT "id" FROM ${context.escape.tableName(ACTIVITY_TABLE)}
			 WHERE "workflowReviewRequestId" = :requestId ORDER BY "id"`,
			{ requestId },
		);
		return rows.map(({ id }) => Number(id));
	}

	async function commentCountOf(
		context: TestMigrationContext,
		activityId: number,
	): Promise<number> {
		const rows = await context.runQuery<unknown[]>(
			`SELECT "id" FROM ${context.escape.tableName(COMMENT_TABLE)} WHERE "activityId" = :activityId`,
			{ activityId },
		);
		return rows.length;
	}

	// Declared before the `up` block so it runs against the pre-migration schema.
	it('rejects a type outside the shipped vocabulary while the check constraint stands', async () => {
		const context = createTestMigrationContext(dataSource);
		try {
			// SQLite says "CHECK constraint failed", Postgres "violates check constraint".
			await expect(
				insertActivity(context, {
					workflowReviewRequestId: preExistingRequestId,
					type: NEW_TYPE,
				}),
			).rejects.toThrow(/check constraint/i);
		} finally {
			await context.queryRunner.release();
		}
	});

	describe('up', () => {
		beforeAll(async () => {
			await runSingleMigration(MIGRATION_NAME);
		});

		it('accepts a type outside the shipped vocabulary', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				const requestId = await seedRequest(context);
				await expect(
					insertActivity(context, { workflowReviewRequestId: requestId, type: NEW_TYPE }),
				).resolves.toEqual(expect.any(Number));
			} finally {
				await context.queryRunner.release();
			}
		});

		it('drops the workflow scoping column', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				expect(await columnExists(context, ACTIVITY_TABLE, WORKFLOW_COLUMN)).toBe(false);
			} finally {
				await context.queryRunner.release();
			}
		});

		// The reason this migration needs a `sqlite/` subclass with `withFKsDisabled`: the table
		// recreation drops the activity table, and the comment table cascades off it.
		it('keeps existing entries and their comment threads through the table recreation', async () => {
			const context = createTestMigrationContext(dataSource);
			try {
				expect(await activityIdsOf(context, preExistingRequestId)).toEqual([preExistingActivityId]);
				expect(await commentCountOf(context, preExistingActivityId)).toBe(2);
			} finally {
				await context.queryRunner.release();
			}
		});

		// The recreation rebuilds the table from its loaded definition, so a lost foreign key
		// would only show up as a cascade that no longer fires.
		it('still removes entries and comments with their review request', async () => {
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

				expect(await activityIdsOf(context, requestId)).toEqual([]);
				expect(await commentCountOf(context, activityId)).toBe(0);
			} finally {
				await context.queryRunner.release();
			}
		});
	});

	describe('down', () => {
		it('restores the constraint and the column, dropping entries the constraint rejects', async () => {
			// Seeded and asserted inside the test rather than in a hook: under a filtered run
			// (`vitest -t`) the `up` hook is skipped, and reverting then would revert whatever
			// migration preceded ours and pass against a schema that was never migrated.
			const before = createTestMigrationContext(dataSource);
			let requestId: string;
			let keptActivityId: number;
			let droppedActivityId: number;
			try {
				expect(await columnExists(before, ACTIVITY_TABLE, WORKFLOW_COLUMN)).toBe(false);

				requestId = await seedRequest(before);
				keptActivityId = await insertActivity(before, {
					workflowReviewRequestId: requestId,
					type: 'comment.created',
				});
				await insertComment(before, keptActivityId);
				droppedActivityId = await insertActivity(before, {
					workflowReviewRequestId: requestId,
					type: NEW_TYPE,
				});
			} finally {
				// Release before reverting: holding a pooled lease across the revert exhausts the
				// Postgres pool and the migration times out trying to connect.
				await before.queryRunner.release();
			}

			await undoLastSingleMigration();

			const after = createTestMigrationContext(dataSource);
			try {
				// Only the entry the restored vocabulary has no room for is gone, comments intact.
				expect(await activityIdsOf(after, requestId)).toEqual([keptActivityId]);
				expect(await activityIdsOf(after, requestId)).not.toContain(droppedActivityId);
				expect(await commentCountOf(after, keptActivityId)).toBe(1);

				await expect(
					insertActivity(after, { workflowReviewRequestId: requestId, type: NEW_TYPE }),
				).rejects.toThrow(/check constraint/i);

				// The column is back, and so is the cascade that made it unusable for delete events.
				expect(await columnExists(after, ACTIVITY_TABLE, WORKFLOW_COLUMN)).toBe(true);
				const workflowId = await seedWorkflow(after);
				const scopedActivityId = await insertActivity(after, {
					workflowReviewRequestId: requestId,
					type: 'review.opened',
					workflowId,
				});
				await after.runQuery(
					`DELETE FROM ${after.escape.tableName('workflow_entity')} WHERE "id" = :id`,
					{ id: workflowId },
				);
				expect(await activityIdsOf(after, requestId)).not.toContain(scopedActivityId);
			} finally {
				await after.queryRunner.release();
			}
		});
	});
});
