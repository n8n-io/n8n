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

const MIGRATION_NAME = 'AddTypeToUserTable1791986966630';

type UserRow = { id: string; type?: string };

describe('AddTypeToUserTable Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
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

	const userTable = () => context.escape.tableName('user');

	async function insertUser(id: string, type?: string) {
		const typeColumn = context.escape.columnName('type');
		const columns = ['id', 'roleSlug'];
		const values = [':id', ':roleSlug'];
		if (type) {
			columns.push(typeColumn);
			values.push(':type');
		}
		await context.runQuery(
			`INSERT INTO ${userTable()} (${columns.join(', ')}) VALUES (${values.join(', ')})`,
			{ id, roleSlug: 'global:member', type },
		);
	}

	async function selectUsers(): Promise<UserRow[]> {
		return await context.runQuery<UserRow[]>(`SELECT * FROM ${userTable()} ORDER BY id`, {});
	}

	it('adds a type column that defaults existing rows to human', async () => {
		const existingId = uuidv7();
		await insertUser(existingId);
		// Release the connection: on SQLite the migration waits for its write lock.
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		// An earlier migration seeds the instance owner, so more than one row exists.
		const rows = await selectUsers();
		expect(rows.find((row) => row.id === existingId)?.type).toBe('human');
		expect(rows.every((row) => row.type === 'human')).toBe(true);
	});

	it('accepts service and rejects other values', async () => {
		const serviceAccountId = uuidv7();
		await insertUser(serviceAccountId, 'service');

		const row = (await selectUsers()).find((user) => user.id === serviceAccountId);
		expect(row?.type).toBe('service');

		await expect(insertUser(uuidv7(), 'robot')).rejects.toThrow();
	});

	it('keeps the foreign keys that point at user', async () => {
		const [row] = await selectUsers();
		const projectId = uuidv7();
		const projectTable = context.escape.tableName('project');
		const relationTable = context.escape.tableName('project_relation');

		await context.runQuery(
			`INSERT INTO ${projectTable} (id, name, type) VALUES (:id, :name, :type)`,
			{ id: projectId, name: 'Acme', type: 'team' },
		);
		await context.runQuery(
			`INSERT INTO ${relationTable} ("projectId", "userId", role) VALUES (:projectId, :userId, :role)`,
			{ projectId, userId: row.id, role: 'project:editor' },
		);

		await expect(
			context.runQuery(
				`INSERT INTO ${relationTable} ("projectId", "userId", role) VALUES (:projectId, :userId, :role)`,
				{ projectId, userId: uuidv7(), role: 'project:editor' },
			),
		).rejects.toThrow();
	});

	it('down removes service accounts, cascades their rows, and drops the column', async () => {
		const relationTable = context.escape.tableName('project_relation');
		const before = await selectUsers();
		const serviceAccountId = before.find((row) => row.type === 'service')!.id;
		const [{ id: projectId }] = await context.runQuery<Array<{ id: string }>>(
			`SELECT id FROM ${context.escape.tableName('project')}`,
			{},
		);
		await context.runQuery(
			`INSERT INTO ${relationTable} ("projectId", "userId", role) VALUES (:projectId, :userId, :role)`,
			{ projectId, userId: serviceAccountId, role: 'project:editor' },
		);

		await undoLastSingleMigration();

		const after = await selectUsers();
		expect(after.map((row) => row.id)).toEqual(
			before.filter((row) => row.type === 'human').map((row) => row.id),
		);
		expect(after.every((row) => row.type === undefined)).toBe(true);

		const [{ count }] = await context.runQuery<Array<{ count: number }>>(
			`SELECT COUNT(*) AS count FROM ${relationTable} WHERE "userId" = :id`,
			{ id: serviceAccountId },
		);
		expect(Number(count)).toBe(0);
	});
});
