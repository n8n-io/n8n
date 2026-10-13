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

const MIGRATION_NAME = 'CreateIdempotencyKeyTable1791540050944';
const TABLE_NAME = 'idempotency_key';

type IdempotencyKeyRow = {
	id: string;
	userId: string;
	idempotencyKey: string;
	status: string;
};

describe('CreateIdempotencyKeyTable migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertUser(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('user');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertKey(
		context: TestMigrationContext,
		row: {
			userId: string;
			idempotencyKey: string;
			status?: string;
			responseStatus?: number | null;
			responseBody?: string | null;
		},
	) {
		const table = context.escape.tableName(TABLE_NAME);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table}
			 ("id", "userId", "idempotencyKey", "fingerprint", "status",
			  "responseStatus", "responseBody", "createdAt", "updatedAt")
			 VALUES (:id, :userId, :idempotencyKey, :fingerprint, :status,
			         :responseStatus, :responseBody, :createdAt, :updatedAt)`,
			{
				id: generateNanoId(),
				userId: row.userId,
				idempotencyKey: row.idempotencyKey,
				fingerprint: 'method-path-body-hash',
				status: row.status ?? 'processing',
				responseStatus: row.responseStatus ?? null,
				responseBody: row.responseBody ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function getKeys(context: TestMigrationContext): Promise<IdempotencyKeyRow[]> {
		const table = context.escape.tableName(TABLE_NAME);
		return await context.runQuery<IdempotencyKeyRow[]>(
			`SELECT "id" AS "id", "userId" AS "userId",
			        "idempotencyKey" AS "idempotencyKey", "status" AS "status"
			 FROM ${table}`,
		);
	}

	it('stores one key per user and rejects a second insert of the same pair', async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, userId);
			await insertUser(context, otherUserId);
			await insertKey(context, { userId, idempotencyKey: 'same-key' });
			await insertKey(context, { userId: otherUserId, idempotencyKey: 'same-key' });
			return await getKeys(context);
		});

		expect(rows).toHaveLength(2);

		await expect(
			withContext(async (context) => {
				await insertKey(context, { userId, idempotencyKey: 'same-key' });
			}),
		).rejects.toThrow(/unique/i);
	});

	it('accepts processing and completed, and rejects any other status', async () => {
		const userId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, userId);
			await insertKey(context, { userId, idempotencyKey: 'in-flight' });
			await insertKey(context, {
				userId,
				idempotencyKey: 'done',
				status: 'completed',
				responseStatus: 201,
			});
			return await getKeys(context);
		});

		expect(rows.map((row) => row.status).sort()).toEqual(['completed', 'processing']);

		await expect(
			withContext(async (context) => {
				await insertKey(context, { userId, idempotencyKey: 'key-1', status: 'failed' });
			}),
		).rejects.toThrow(/check constraint/i);
	});

	it('requires a response status only after the request completes', async () => {
		const userId = randomUUID();

		await expect(
			withContext(async (context) => {
				await insertUser(context, userId);
				await insertKey(context, { userId, idempotencyKey: 'done', status: 'completed' });
			}),
		).rejects.toThrow(/check constraint/i);

		await expect(
			withContext(async (context) => {
				await insertKey(context, {
					userId,
					idempotencyKey: 'early',
					responseStatus: 200,
				});
			}),
		).rejects.toThrow(/check constraint/i);
	});

	it('removes keys owned by a deleted user', async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, userId);
			await insertUser(context, otherUserId);
			await insertKey(context, {
				userId,
				idempotencyKey: 'key-1',
				status: 'completed',
				responseStatus: 201,
				responseBody: '{"id":"wf-1"}',
			});
			await insertKey(context, { userId: otherUserId, idempotencyKey: 'key-1' });

			const userTable = context.escape.tableName('user');
			await context.runQuery(`DELETE FROM ${userTable} WHERE "id" = :userId`, { userId });

			return await getKeys(context);
		});

		expect(rows).toEqual([
			expect.objectContaining({ userId: otherUserId, idempotencyKey: 'key-1' }),
		]);
	});

	it('drops the table on revert', async () => {
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName(TABLE_NAME);
			await expect(context.runQuery(`SELECT 1 FROM ${table}`)).rejects.toThrow();
		});
	});
});
