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

const migrationName = 'AllowImportSourceOnAiPreference1795524706285';
const existingSources = ['ui', 'aia', 'mcp', 'api'];
const columns = [
	'id',
	'content',
	'source',
	'userId',
	'projectId',
	'createdById',
	'createdAt',
	'updatedAt',
];

type PreferenceRow = {
	id: string;
	content: string;
	source: string;
	userId: string | null;
	projectId: string | null;
	createdById: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
};

describe('AllowImportSourceOnAiPreference migration', () => {
	let dataSource: DataSource;
	const userId = randomUUID();
	const creatorId = randomUUID();
	const projectId = randomUUID();

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
		await withContext(async ({ escape, runQuery }) => {
			for (const id of [userId, creatorId]) {
				await runQuery(
					`INSERT INTO ${escape.tableName('user')} (${escape.columnName('id')}) VALUES (:id)`,
					{ id },
				);
			}
			await runQuery(
				`INSERT INTO ${escape.tableName('project')}
				 (${['id', 'name', 'type', 'customTelemetryTags'].map(escape.columnName).join(', ')})
				 VALUES (:id, 'Test project', 'team', '[]')`,
				{ id: projectId },
			);
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertPreference(
		{ escape, runQuery }: TestMigrationContext,
		source: string,
		target: Partial<Pick<PreferenceRow, 'userId' | 'projectId' | 'createdById'>> = {},
	) {
		await runQuery(
			`INSERT INTO ${escape.tableName('ai_preference')}
			 (${columns.map(escape.columnName).join(', ')})
			 VALUES (:id, :content, :source, :userId, :projectId, :createdById, :createdAt, :updatedAt)`,
			{
				id: randomUUID(),
				content: `Written by ${source}.`,
				source,
				userId: null,
				projectId: null,
				createdById: creatorId,
				createdAt: new Date('2026-01-01T12:00:00.000Z'),
				updatedAt: new Date('2026-01-02T12:00:00.000Z'),
				...target,
			},
		);
	}

	async function insertSources(context: TestMigrationContext, sources: string[]) {
		for (const source of sources) {
			for (const target of [{}, { userId }, { projectId }, { createdById: null }]) {
				await insertPreference(context, source, target);
			}
		}
	}

	async function readPreferences({ escape, runQuery }: TestMigrationContext) {
		return await runQuery<PreferenceRow[]>(
			`SELECT ${columns.map(escape.columnName).join(', ')}
			 FROM ${escape.tableName('ai_preference')} ORDER BY ${escape.columnName('id')}`,
		);
	}

	it('refuses the import source before the migration', async () => {
		await expect(
			withContext(async (context) => await insertPreference(context, 'import')),
		).rejects.toThrow(/check constraint/i);
	});

	it('preserves existing rows and accepts imported rows in every scope', async () => {
		await withContext(async (context) => await insertSources(context, existingSources));
		const before = await withContext(readPreferences);

		await runSingleMigration(migrationName);

		expect(await withContext(readPreferences)).toEqual(before);
		await withContext(async (context) => await insertSources(context, ['import']));
		const after = await withContext(readPreferences);
		expect(after.filter((row) => row.source === 'import')).toHaveLength(4);
		expect(after.filter((row) => row.source !== 'import')).toEqual(before);
	});

	it('refuses unsupported sources after the migration', async () => {
		await runSingleMigration(migrationName);

		await expect(
			withContext(async (context) => await insertPreference(context, 'unknown')),
		).rejects.toThrow(/check constraint/i);
	});

	it('relabels only imported rows as ui on rollback and can upgrade again', async () => {
		await runSingleMigration(migrationName);
		await withContext(
			async (context) => await insertSources(context, [...existingSources, 'import']),
		);
		const before = await withContext(readPreferences);

		await undoLastSingleMigration();

		const expected = before.map((row) => ({
			...row,
			source: row.source === 'import' ? 'ui' : row.source,
		}));
		expect(await withContext(readPreferences)).toEqual(expected);
		await expect(
			withContext(async (context) => await insertPreference(context, 'import')),
		).rejects.toThrow(/check constraint/i);
		await expect(
			withContext(async (context) => await insertPreference(context, 'unknown')),
		).rejects.toThrow(/check constraint/i);

		await runSingleMigration(migrationName);

		expect(await withContext(readPreferences)).toEqual(expected);
		await withContext(async (context) => await insertPreference(context, 'import'));
	});
});
