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
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreatePreferenceTable1788882375989';
const PREFERENCE_TABLE = 'preference';

type PreferenceRow = {
	id: string;
	scope: string;
	userId: string | null;
	projectId: string | null;
	createdById: string | null;
};

describe('CreatePreferenceTable migration', () => {
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
		await withContext(async (context) => await context.queryRunner.clearDatabase());
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

	async function insertProject(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertPreference(
		context: TestMigrationContext,
		row: {
			scope: string;
			userId?: string | null;
			projectId?: string | null;
			createdById?: string | null;
		},
	) {
		const table = context.escape.tableName(PREFERENCE_TABLE);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "scope", "content", "userId", "projectId", "createdById", "createdAt", "updatedAt")
			 VALUES (:id, :scope, :content, :userId, :projectId, :createdById, :createdAt, :updatedAt)`,
			{
				id: randomUUID(),
				scope: row.scope,
				content: 'Prefer sub-workflows to groups.',
				userId: row.userId ?? null,
				projectId: row.projectId ?? null,
				createdById: row.createdById ?? null,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function getPreferences(context: TestMigrationContext): Promise<PreferenceRow[]> {
		const table = context.escape.tableName(PREFERENCE_TABLE);
		return await context.runQuery<PreferenceRow[]>(
			`SELECT "id" AS "id", "scope" AS "scope", "userId" AS "userId", "projectId" AS "projectId",
			        "createdById" AS "createdById"
			 FROM ${table} ORDER BY "scope"`,
		);
	}

	it('accepts one preference per scope', async () => {
		const userId = randomUUID();
		const projectId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, userId);
			await insertProject(context, projectId);
			await insertPreference(context, { scope: 'global' });
			await insertPreference(context, { scope: 'personal', userId });
			await insertPreference(context, { scope: 'project', projectId });
			return await getPreferences(context);
		});

		expect(rows.map((row) => row.scope)).toEqual(['global', 'personal', 'project']);
	});

	it.each([
		['a personal preference without a user', { scope: 'personal' }],
		['a project preference without a project', { scope: 'project' }],
		['a global preference with a project', { scope: 'global', projectId: 'p' }],
		['an unknown scope', { scope: 'team' }],
	])('rejects %s', async (_, row) => {
		await expect(
			withContext(async (context) => {
				if (row.projectId) await insertProject(context, row.projectId);
				await insertPreference(context, row);
			}),
		).rejects.toThrow();
	});

	it('removes personal preferences when their user is deleted', async () => {
		const userId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, userId);
			await insertPreference(context, { scope: 'global' });
			await insertPreference(context, { scope: 'personal', userId });

			const userTable = context.escape.tableName('user');
			await context.runQuery(`DELETE FROM ${userTable} WHERE "id" = :userId`, { userId });

			return await getPreferences(context);
		});

		expect(rows.map((row) => row.scope)).toEqual(['global']);
	});

	it('keeps a preference when its author is deleted, dropping only the attribution', async () => {
		const authorId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertUser(context, authorId);
			await insertPreference(context, { scope: 'global', createdById: authorId });

			const userTable = context.escape.tableName('user');
			await context.runQuery(`DELETE FROM ${userTable} WHERE "id" = :authorId`, { authorId });

			return await getPreferences(context);
		});

		expect(rows).toHaveLength(1);
		expect(rows[0].createdById).toBeNull();
	});

	it('removes project preferences when their project is deleted', async () => {
		const projectId = randomUUID();

		const rows = await withContext(async (context) => {
			await insertProject(context, projectId);
			await insertPreference(context, { scope: 'global' });
			await insertPreference(context, { scope: 'project', projectId });

			const projectTable = context.escape.tableName('project');
			await context.runQuery(`DELETE FROM ${projectTable} WHERE "id" = :projectId`, {
				projectId,
			});

			return await getPreferences(context);
		});

		expect(rows.map((row) => row.scope)).toEqual(['global']);
	});

	it('drops the table on revert', async () => {
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName(PREFERENCE_TABLE);
			await expect(context.runQuery(`SELECT 1 FROM ${table}`)).rejects.toThrow();
		});
	});
});
