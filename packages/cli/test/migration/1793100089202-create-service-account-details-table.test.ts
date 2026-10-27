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
import { v7 as uuidv7 } from 'uuid';

const MIGRATION_NAME = 'CreateServiceAccountDetailsTable1793100089202';

type UserRow = Record<string, unknown> & { id: string };

describe('CreateServiceAccountDetailsTable Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let usersBefore: UserRow[];
	const personId = uuidv7();

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await insertUser(personId, 'person');
		usersBefore = await selectUsers();
		// Release the connection: on SQLite the migration waits for its write lock.
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
	});

	beforeEach(() => {
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const table = (name: string) => context.escape.tableName(name);
	const column = (name: string) => context.escape.columnName(name);

	async function insertUser(id: string, kind: string) {
		await context.runQuery(
			`INSERT INTO ${table('user')} (id, ${column('roleSlug')}, ${column('kind')}) VALUES (:id, :roleSlug, :kind)`,
			{ id, roleSlug: 'global:member', kind },
		);
	}

	async function selectUsers(): Promise<UserRow[]> {
		return await context.runQuery<UserRow[]>(`SELECT * FROM ${table('user')} ORDER BY id`);
	}

	async function insertDetails(userId: string, name: string | null) {
		await context.runQuery(
			`INSERT INTO ${table('service_account_details')} (${column('userId')}, name) VALUES (:userId, :name)`,
			{ userId, name },
		);
	}

	async function countDetails(userId: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${table('service_account_details')} WHERE ${column('userId')} = :userId`,
			{ userId },
		);
		return Number(count);
	}

	it('does not change existing users', async () => {
		expect(usersBefore.map((row) => row.id)).toContain(personId);
		expect(await selectUsers()).toEqual(usersBefore);
	});

	it('stores details for a service account and sets the timestamps', async () => {
		const serviceAccountId = uuidv7();
		await insertUser(serviceAccountId, 'service');

		await insertDetails(serviceAccountId, 'Deploy bot');

		const [row] = await context.runQuery<
			Array<{ name: string; createdAt: unknown; updatedAt: unknown }>
		>(
			`SELECT name, ${column('createdAt')} AS "createdAt", ${column('updatedAt')} AS "updatedAt" FROM ${table('service_account_details')} WHERE ${column('userId')} = :userId`,
			{ userId: serviceAccountId },
		);
		expect(row.name).toBe('Deploy bot');
		expect(row.createdAt).toBeTruthy();
		expect(row.updatedAt).toBeTruthy();
	});

	it('rejects details without a name', async () => {
		const serviceAccountId = uuidv7();
		await insertUser(serviceAccountId, 'service');

		await expect(insertDetails(serviceAccountId, null)).rejects.toThrow();
	});

	it('rejects details for an unknown user', async () => {
		await expect(insertDetails(uuidv7(), 'Unknown')).rejects.toThrow();
	});

	it('deletes the details with their user', async () => {
		const serviceAccountId = uuidv7();
		await insertUser(serviceAccountId, 'service');
		await insertDetails(serviceAccountId, 'Short-lived bot');

		await context.runQuery(`DELETE FROM ${table('user')} WHERE id = :id`, {
			id: serviceAccountId,
		});

		expect(await countDetails(serviceAccountId)).toBe(0);
	});

	// Runs last: it reverts the migration.
	it('down drops the table and keeps the users', async () => {
		const usersBeforeDown = await selectUsers();
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		expect(await selectUsers()).toEqual(usersBeforeDown);
		await expect(
			context.runQuery(`SELECT 1 FROM ${table('service_account_details')}`),
		).rejects.toThrow();
	});
});
