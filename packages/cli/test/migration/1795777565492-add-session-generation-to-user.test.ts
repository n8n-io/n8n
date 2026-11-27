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

const MIGRATION_NAME = 'AddSessionGenerationToUser1795777565492';

type UserRow = { id: string; sessionGeneration?: number };

describe('AddSessionGenerationToUser Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	const existingUserId = uuidv7();
	const projectId = uuidv7();

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);

		const setup = createTestMigrationContext(dataSource);
		await setup.queryRunner.clearDatabase();
		await setup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		await context.runQuery(
			`INSERT INTO ${table('user')} (id, ${column('roleSlug')}) VALUES (:id, :roleSlug)`,
			{ id: existingUserId, roleSlug: 'global:member' },
		);
		await context.runQuery(
			`INSERT INTO ${table('project')} (id, name, type) VALUES (:id, :name, :type)`,
			{ id: projectId, name: 'Acme', type: 'team' },
		);
		await context.runQuery(
			`INSERT INTO ${table('project_relation')} (${column('projectId')}, ${column('userId')}, role) VALUES (:projectId, :userId, :role)`,
			{ projectId, userId: existingUserId, role: 'project:editor' },
		);
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

	async function selectUsers(): Promise<UserRow[]> {
		return await context.runQuery<UserRow[]>(`SELECT * FROM ${table('user')} ORDER BY id`);
	}

	async function countProjectRelations(userId: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${table('project_relation')} WHERE ${column('userId')} = :userId`,
			{ userId },
		);
		return Number(count);
	}

	it('adds sessionGeneration with default 0 for existing users and keeps referencing rows', async () => {
		const rows = await selectUsers();
		expect(rows.map((row) => row.id)).toContain(existingUserId);
		expect(rows.every((row) => Number(row.sessionGeneration) === 0)).toBe(true);
		expect(await countProjectRelations(existingUserId)).toBe(1);
	});

	it('reverts cleanly with down() and re-applies with up() while keeping referencing rows', async () => {
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		const rowsAfterDown = await selectUsers();
		expect(rowsAfterDown.every((row) => row.sessionGeneration === undefined)).toBe(true);
		expect(await countProjectRelations(existingUserId)).toBe(1);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		const rowsAfterReapply = await selectUsers();
		expect(rowsAfterReapply.every((row) => Number(row.sessionGeneration) === 0)).toBe(true);
		expect(await countProjectRelations(existingUserId)).toBe(1);
	});
});
