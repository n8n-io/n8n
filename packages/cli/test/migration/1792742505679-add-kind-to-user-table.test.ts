import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, TableCheck } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

const MIGRATION_NAME = 'AddKindToUserTable1792742505679';

type UserRow = { id: string; kind?: string };
type ForeignKeyRow = { table: string; column: string; onDelete: string };

describe('AddKindToUserTable Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let foreignKeysBefore: ForeignKeyRow[];
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
		await insertUser(existingUserId);
		await context.runQuery(
			`INSERT INTO ${table('project')} (id, name, type) VALUES (:id, :name, :type)`,
			{ id: projectId, name: 'Acme', type: 'team' },
		);
		await addToProject(existingUserId, projectId);
		foreignKeysBefore = await listForeignKeysToUser();
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

	async function insertUser(id: string, kind?: string) {
		const columns = ['id', column('roleSlug')];
		const values = [':id', ':roleSlug'];
		if (kind) {
			columns.push(column('kind'));
			values.push(':kind');
		}
		await context.runQuery(
			`INSERT INTO ${table('user')} (${columns.join(', ')}) VALUES (${values.join(', ')})`,
			{ id, roleSlug: 'global:member', kind },
		);
	}

	async function selectUsers(): Promise<UserRow[]> {
		return await context.runQuery<UserRow[]>(`SELECT * FROM ${table('user')} ORDER BY id`);
	}

	async function addToProject(userId: string, projectId: string) {
		await context.runQuery(
			`INSERT INTO ${table('project_relation')} (${column('projectId')}, ${column('userId')}, role) VALUES (:projectId, :userId, :role)`,
			{ projectId, userId, role: 'project:editor' },
		);
	}

	async function countRows(tableName: string, userId: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${table(tableName)} WHERE ${column('userId')} = :userId`,
			{ userId },
		);
		return Number(count);
	}

	async function listForeignKeysToUser(): Promise<ForeignKeyRow[]> {
		const userTable = `${context.tablePrefix}user`;
		const rows = context.isSqlite
			? await context.runQuery<ForeignKeyRow[]>(
					`SELECT m.name AS "table", p."from" AS "column", p.on_delete AS "onDelete"
					 FROM sqlite_master m JOIN pragma_foreign_key_list(m.name) p
					 WHERE m.type = 'table' AND p."table" = :userTable`,
					{ userTable },
				)
			: await context.runQuery<ForeignKeyRow[]>(
					`SELECT c.conrelid::regclass::text AS "table", a.attname AS "column", c.confdeltype AS "onDelete"
					 FROM pg_constraint c
					 JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
					 WHERE c.contype = 'f' AND c.confrelid = CAST(:userTable AS regclass)`,
					{ userTable: table('user') },
				);
		return rows.sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
	}

	/**
	 * A later migration can rebuild `user` on SQLite, as seven earlier ones did.
	 * `down` must still be able to drop the column after that.
	 */
	async function rebuildUserTable() {
		const userTable = `${context.tablePrefix}user`;
		await context.runQuery('PRAGMA foreign_keys=OFF');
		await context.queryRunner.getTable(userTable);
		await context.queryRunner.createCheckConstraint(
			userTable,
			new TableCheck({ name: 'CHK_test_rebuild', expression: `${column('disabled')} IN (0, 1)` }),
		);
		await context.runQuery('PRAGMA foreign_keys=ON');
	}

	it('gives every existing user the person kind and keeps its id', async () => {
		// An earlier migration seeds the instance owner, so more than one row exists.
		const rows = await selectUsers();
		expect(rows.map((row) => row.id)).toContain(existingUserId);
		expect(rows.every((row) => row.kind === 'person')).toBe(true);
	});

	it('keeps the linked rows of existing users', async () => {
		expect(await countRows('project_relation', existingUserId)).toBe(1);
	});

	it('keeps every foreign key to user with its delete rule', async () => {
		expect(foreignKeysBefore.length).toBeGreaterThan(0);
		expect(await listForeignKeysToUser()).toEqual(foreignKeysBefore);
	});

	it('accepts the service kind', async () => {
		const serviceAccountId = uuidv7();
		await insertUser(serviceAccountId, 'service');

		const row = (await selectUsers()).find((user) => user.id === serviceAccountId);
		expect(row?.kind).toBe('service');
	});

	it('rejects other kinds on PostgreSQL', async () => {
		// SQLite has no CHECK on `kind`. The migration docblock explains why.
		if (context.isSqlite) return;

		await expect(insertUser(uuidv7(), 'robot')).rejects.toThrow();
	});

	// Runs last: it reverts the migration.
	it('down removes service accounts with their linked rows and drops the column', async () => {
		const serviceAccountId = uuidv7();
		await insertUser(serviceAccountId, 'service');
		await addToProject(serviceAccountId, projectId);
		// `auth_identity` has no delete rule, so `down` removes these rows itself.
		await context.runQuery(
			`INSERT INTO ${table('auth_identity')} (${column('userId')}, ${column('providerId')}, ${column('providerType')}) VALUES (:userId, :providerId, :providerType)`,
			{ userId: serviceAccountId, providerId: 'service-subject', providerType: 'oidc' },
		);
		const personIds = (await selectUsers())
			.filter((row) => row.kind === 'person')
			.map((row) => row.id);
		if (context.isSqlite) await rebuildUserTable();
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		const rows = await selectUsers();
		expect(rows.map((row) => row.id)).toEqual(personIds);
		expect(rows.every((row) => row.kind === undefined)).toBe(true);
		expect(await countRows('project_relation', serviceAccountId)).toBe(0);
		expect(await countRows('auth_identity', serviceAccountId)).toBe(0);
		expect(await countRows('project_relation', existingUserId)).toBe(1);
	});
});
