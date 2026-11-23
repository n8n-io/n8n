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

const migrationName = 'AllowApiSourceOnAiPreference1795100170853';

describe('AllowApiSourceOnAiPreference migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
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
		await initDbUpToMigration(migrationName);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertPreference(context: TestMigrationContext, source: string) {
		const id = randomUUID();
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('ai_preference')}
			 (${['id', 'content', 'source', 'createdAt', 'updatedAt'].map(context.escape.columnName).join(', ')})
			 VALUES (:id, :content, :source, :createdAt, :updatedAt)`,
			{ id, content: `Written by ${source}`, source, createdAt: now, updatedAt: now },
		);
		return id;
	}

	async function sourceOf(context: TestMigrationContext, id: string) {
		const [row] = await context.runQuery<Array<{ source: string }>>(
			`SELECT ${context.escape.columnName('source')} AS source FROM ${context.escape.tableName('ai_preference')} WHERE ${context.escape.columnName('id')} = :id`,
			{ id },
		);
		return row.source;
	}

	it('refuses the api source before the migration', async () => {
		await expect(
			withContext(async (context) => await insertPreference(context, 'api')),
		).rejects.toThrow();
	});

	it('accepts the api source and keeps the existing rows', async () => {
		const settingsRow = await withContext(async (context) => await insertPreference(context, 'ui'));

		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			const apiRow = await insertPreference(context, 'api');
			expect(await sourceOf(context, apiRow)).toBe('api');
			expect(await sourceOf(context, settingsRow)).toBe('ui');
		});
	});

	it('still refuses an unknown source after the migration', async () => {
		await runSingleMigration(migrationName);

		await expect(
			withContext(async (context) => await insertPreference(context, 'slack')),
		).rejects.toThrow();
	});

	it('relabels api rows as settings rows on revert', async () => {
		await runSingleMigration(migrationName);
		const apiRow = await withContext(async (context) => await insertPreference(context, 'api'));

		await undoLastSingleMigration();

		await withContext(async (context) => {
			expect(await sourceOf(context, apiRow)).toBe('ui');
			await expect(insertPreference(context, 'api')).rejects.toThrow();
		});
	});
});
