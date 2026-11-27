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

const MIGRATION_NAME = 'AddSessionGenerationToUserTable1795773237496';

type UserRow = { id: string; sessionGeneration?: number };
type ForeignKeyRow = { table: string; column: string; onDelete: string };

describe('AddSessionGenerationToUserTable Migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;
	let foreignKeysBefore: ForeignKeyRow[];
	const existingUserId = uuidv7();
	const projectId = uuidv7();

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
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
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
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

	async function insertUser(id: string) {
		await context.runQuery(
			`INSERT INTO ${table('user')} (id, ${column('roleSlug')}) VALUES (:id, :roleSlug)`,
			{ id, roleSlug: 'global:member' },
		);
	}

	async function addToProject(userId: string, targetProjectId: string) {
		await context.runQuery(
			`INSERT INTO ${table('project_relation')} (${column('projectId')}, ${column('userId')}, role) VALUES (:projectId, :userId, :role)`,
			{ projectId: targetProjectId, userId, role: 'project:editor' },
		);
	}

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

	async function readColumnInfo() {
		const userTable = `${context.tablePrefix}user`;
		if (context.isSqlite) {
			const rows = await context.runQuery<
				Array<{ name: string; type: string; notnull: number; dflt_value: string | null }>
			>(`PRAGMA table_info(${table('user')})`);
			return rows.find((row) => row.name === 'sessionGeneration');
		}
		const rows = await context.runQuery<
			Array<{
				column_name: string;
				data_type: string;
				is_nullable: string;
				column_default: string | null;
			}>
		>(
			`SELECT column_name, data_type, is_nullable, column_default
			 FROM information_schema.columns
			 WHERE table_schema = current_schema()
			   AND table_name = :userTable
			   AND column_name = 'sessionGeneration'`,
			{ userTable },
		);
		return rows[0];
	}

	it('adds sessionGeneration with default 0 and preserves existing users and foreign keys', async () => {
		const rows = await selectUsers();
		expect(rows.map((row) => row.id)).toContain(existingUserId);
		expect(rows.every((row) => Number(row.sessionGeneration) === 0)).toBe(true);
		expect(await countProjectRelations(existingUserId)).toBe(1);
		expect(await listForeignKeysToUser()).toEqual(foreignKeysBefore);

		const newUserId = uuidv7();
		await insertUser(newUserId);
		const inserted = (await selectUsers()).find((row) => row.id === newUserId);
		expect(Number(inserted?.sessionGeneration)).toBe(0);

		const colInfo = await readColumnInfo();
		expect(colInfo).toBeDefined();
		if (context.isSqlite) {
			const sqliteCol = colInfo as { type: string; notnull: number; dflt_value: string | null };
			expect(sqliteCol.type.toUpperCase()).toBe('INTEGER');
			expect(sqliteCol.notnull).toBe(1);
			expect(sqliteCol.dflt_value).toBe('0');
		} else {
			const pgCol = colInfo as {
				data_type: string;
				is_nullable: string;
				column_default: string | null;
			};
			expect(pgCol.data_type).toBe('integer');
			expect(pgCol.is_nullable).toBe('NO');
			expect(pgCol.column_default).toBe('0');
		}
	});

	it('reverts cleanly and can be re-applied without losing referencing rows', async () => {
		await context.runQuery(
			`UPDATE ${table('user')} SET ${column('sessionGeneration')} = 3 WHERE id = :id`,
			{ id: existingUserId },
		);
		await context.queryRunner.release();

		await undoLastSingleMigration();

		context = createTestMigrationContext(dataSource);
		expect(await readColumnInfo()).toBeUndefined();
		expect(await countProjectRelations(existingUserId)).toBe(1);
		expect(await listForeignKeysToUser()).toEqual(foreignKeysBefore);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);
		expect(await readColumnInfo()).toBeDefined();
		const existing = (await selectUsers()).find((row) => row.id === existingUserId);
		expect(Number(existing?.sessionGeneration)).toBe(0);
		expect(await countProjectRelations(existingUserId)).toBe(1);
	});
});
