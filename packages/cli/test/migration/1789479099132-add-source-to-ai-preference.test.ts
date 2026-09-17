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

const MIGRATION_NAME = 'AddSourceToAiPreference1789479099132';
const AI_PREFERENCE_TABLE = 'ai_preference';

type PreferenceRow = { id: string; content: string; source: string | null };

describe('AddSourceToAiPreference migration', () => {
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
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	/** A row as it looked before the column existed: written by the settings UI. */
	async function insertPreferenceWithoutSource(context: TestMigrationContext, content: string) {
		const table = context.escape.tableName(AI_PREFERENCE_TABLE);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "content", "userId", "projectId", "createdById", "createdAt", "updatedAt")
			 VALUES (:id, :content, NULL, NULL, NULL, :createdAt, :updatedAt)`,
			{ id: randomUUID(), content, createdAt: now, updatedAt: now },
		);
	}

	async function insertPreferenceWithSource(
		context: TestMigrationContext,
		content: string,
		source: string | null,
	) {
		const table = context.escape.tableName(AI_PREFERENCE_TABLE);
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "content", "source", "userId", "projectId", "createdById", "createdAt", "updatedAt")
			 VALUES (:id, :content, :source, NULL, NULL, NULL, :createdAt, :updatedAt)`,
			{ id: randomUUID(), content, source, createdAt: now, updatedAt: now },
		);
	}

	async function getPreferences(context: TestMigrationContext): Promise<PreferenceRow[]> {
		const table = context.escape.tableName(AI_PREFERENCE_TABLE);
		return await context.runQuery<PreferenceRow[]>(
			`SELECT "id" AS "id", "content" AS "content", "source" AS "source" FROM ${table}`,
		);
	}

	it('reads `ui` for every row that existed before the column', async () => {
		// Only the settings UI could write a preference before this migration, so `ui` is
		// the true answer for those rows rather than a placeholder.
		//
		// Read no `source` before the migration: the column does not exist yet, and on
		// SQLite a query for it would return the literal string instead of failing.
		const before = await withContext(async (context) => {
			await insertPreferenceWithoutSource(context, 'Prefer sub-workflows to groups.');
			await insertPreferenceWithoutSource(context, 'Keep replies short.');
			const table = context.escape.tableName(AI_PREFERENCE_TABLE);
			return await context.runQuery<Array<{ content: string }>>(
				`SELECT "content" AS "content" FROM ${table}`,
			);
		});
		expect(before).toHaveLength(2);

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const migrated = await withContext(getPreferences);
		expect(migrated).toHaveLength(2);
		expect(migrated.every((row) => row.source === 'ui')).toBe(true);
	});

	it('refuses a row that names no surface', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		// NOT NULL and no default: a write path that forgets its surface fails here
		// instead of recording a silent `ui`.
		await expect(
			withContext(
				async (context) => await insertPreferenceWithoutSource(context, 'No surface named.'),
			),
		).rejects.toThrow();
	});

	it('refuses a surface outside ui, aia and mcp', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await expect(
			withContext(
				async (context) => await insertPreferenceWithSource(context, 'Bad surface.', 'slack'),
			),
		).rejects.toThrow();
	});

	it.each(['ui', 'aia', 'mcp'])('accepts a row written by %s', async (source) => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const rows = await withContext(async (context) => {
			await insertPreferenceWithSource(context, `Written by ${source}.`, source);
			return await getPreferences(context);
		});

		expect(rows).toEqual([expect.objectContaining({ source })]);
	});

	it('drops the column on revert and keeps the rows', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		await withContext(
			async (context) => await insertPreferenceWithSource(context, 'Keep me.', 'aia'),
		);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const table = context.escape.tableName(AI_PREFERENCE_TABLE);
			const rows = await context.runQuery<Array<{ content: string }>>(
				`SELECT "content" AS "content" FROM ${table}`,
			);
			expect(rows).toEqual([{ content: 'Keep me.' }]);

			// Read from the schema, not with a SELECT: SQLite reads an unknown
			// double-quoted name as a string literal, so a query would pass either way.
			const schema = await context.queryRunner.getTable(
				`${context.tablePrefix}${AI_PREFERENCE_TABLE}`,
			);
			expect(schema?.columns.map((column) => column.name)).not.toContain('source');
		});
	});
});
