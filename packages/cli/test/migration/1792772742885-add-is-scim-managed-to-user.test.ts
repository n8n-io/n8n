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

const MIGRATION_NAME = 'AddIsScimManagedToUser1792772742885';

type UserRow = { id: string; isScimManaged: boolean | number };

describe('AddIsScimManagedToUser migration', () => {
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
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	const col = (context: TestMigrationContext, name: string) => context.escape.columnName(name);

	async function insertUser(
		context: TestMigrationContext,
		{ isScimManaged }: { isScimManaged?: boolean } = {},
	) {
		const id = randomUUID();
		const columns = ['id', 'email', 'password', 'roleSlug'];
		const values = [':id', ':email', "'hashed'", ':role'];
		const parameters: Record<string, string | boolean> = {
			id,
			email: `${id}@test.com`,
			role: 'global:member',
		};
		// PostgreSQL rejects a bound parameter that the statement does not use.
		if (isScimManaged !== undefined) {
			columns.push('isScimManaged');
			values.push(':isScimManaged');
			parameters.isScimManaged = isScimManaged;
		}
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('user')} (${columns.map((name) => col(context, name)).join(', ')})
			 VALUES (${values.join(', ')})`,
			parameters,
		);
		return id;
	}

	/** A personal project and its relation, so the test sees a cascade from `user`. */
	async function insertPersonalProject(context: TestMigrationContext, userId: string) {
		const projectId = generateNanoId();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} (${col(context, 'id')}, ${col(context, 'name')}, ${col(context, 'type')})
			 VALUES (:projectId, 'Personal', 'personal')`,
			{ projectId },
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project_relation')} (${col(context, 'projectId')}, ${col(context, 'userId')}, ${col(context, 'role')})
			 VALUES (:projectId, :userId, :role)`,
			{ projectId, userId, role: 'project:personalOwner' },
		);
	}

	/** The given users. Earlier migrations also create the shell owner. */
	async function getUsers(context: TestMigrationContext, ids: string[]) {
		const rows = await context.runQuery<UserRow[]>(
			`SELECT ${col(context, 'id')} AS ${col(context, 'id')}, ${col(context, 'isScimManaged')} AS ${col(context, 'isScimManaged')}
			 FROM ${context.escape.tableName('user')}`,
		);
		// SQLite returns booleans as 0 or 1.
		return rows
			.filter(({ id }) => ids.includes(id))
			.map(({ id, isScimManaged }) => ({ id, isScimManaged: Boolean(isScimManaged) }));
	}

	async function userColumns(context: TestMigrationContext) {
		if (context.isSqlite) {
			const rows = await context.runQuery<Array<{ name: string }>>(
				`PRAGMA table_info(${context.escape.tableName('user')})`,
			);
			return rows.map(({ name }) => name);
		}
		const rows = await context.runQuery<Array<{ column_name: string }>>(
			'SELECT column_name FROM information_schema.columns WHERE table_name = :table',
			{ table: `${context.tablePrefix}user` },
		);
		return rows.map(({ column_name }) => column_name);
	}

	async function countProjectRelations(context: TestMigrationContext, userId: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${col(context, 'count')} FROM ${context.escape.tableName('project_relation')}
			 WHERE ${col(context, 'userId')} = :userId`,
			{ userId },
		);
		return Number(count);
	}

	it('marks existing users as not SCIM-managed and keeps the rows that reference them', async () => {
		const userId = await withContext(async (context) => {
			const id = await insertUser(context);
			await insertPersonalProject(context, id);
			return id;
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await getUsers(context, [userId])).toEqual([{ id: userId, isScimManaged: false }]);
			expect(await countProjectRelations(context, userId)).toBe(1);
		});
	});

	it('defaults new users to not SCIM-managed and stores the marker', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const unmarked = await insertUser(context);
			const marked = await insertUser(context, { isScimManaged: true });

			const users = await getUsers(context, [unmarked, marked]);
			expect(users).toHaveLength(2);
			expect(users).toEqual(
				expect.arrayContaining([
					{ id: unmarked, isScimManaged: false },
					{ id: marked, isScimManaged: true },
				]),
			);
		});
	});

	it('rejects a null marker', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const id = await insertUser(context);
			await expect(
				context.runQuery(
					`UPDATE ${context.escape.tableName('user')} SET ${col(context, 'isScimManaged')} = NULL WHERE ${col(context, 'id')} = :id`,
					{ id },
				),
			).rejects.toThrow();
		});
	});

	it('drops the column and keeps the users on revert', async () => {
		const userId = await withContext(async (context) => {
			const id = await insertUser(context);
			await insertPersonalProject(context, id);
			return id;
		});
		await runSingleMigration(MIGRATION_NAME);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await userColumns(context)).not.toContain('isScimManaged');
			const rows = await context.runQuery<Array<{ id: string }>>(
				`SELECT ${col(context, 'id')} AS ${col(context, 'id')} FROM ${context.escape.tableName('user')}
				 WHERE ${col(context, 'id')} = :userId`,
				{ userId },
			);
			expect(rows).toEqual([{ id: userId }]);
			expect(await countProjectRelations(context, userId)).toBe(1);
		});
	});
});
