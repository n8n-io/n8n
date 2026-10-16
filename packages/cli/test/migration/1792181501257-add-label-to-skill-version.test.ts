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

const MIGRATION_NAME = 'AddLabelToSkillVersion1792181501257';

type Row = Record<string, string | number | Date | null>;

describe('AddLabelToSkillVersion migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertRow(context: TestMigrationContext, tableName: string, values: Row) {
		const columns = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(tableName)}
			 (${columns.map((name) => context.escape.columnName(name)).join(', ')})
			 VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	/** One skill with v1 and one file of v1. Returns the version id. */
	async function insertSkillWithFile(context: TestMigrationContext): Promise<string> {
		const now = new Date();
		const skillId = `skill_${randomUUID().slice(0, 8)}`;
		const versionId = randomUUID();
		await insertRow(context, 'skill', {
			id: skillId,
			source: 'ui',
			createdAt: now,
			updatedAt: now,
		});
		await insertRow(context, 'skill_version', {
			id: versionId,
			skillId,
			version: 1,
			name: 'Brand voice',
			description: 'How we write',
			instructions: 'Be brief.',
			contentHash: 'a'.repeat(64),
			createdAt: now,
			updatedAt: now,
		});
		await insertRow(context, 'skill_file', {
			skillVersionId: versionId,
			path: 'references/tone.md',
			content: 'Calm.',
			createdAt: now,
			updatedAt: now,
		});
		return versionId;
	}

	async function countFiles(context: TestMigrationContext, versionId: string): Promise<number> {
		const rows = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${context.escape.columnName('count')} FROM ${context.escape.tableName('skill_file')}
			 WHERE ${context.escape.columnName('skillVersionId')} = :versionId`,
			{ versionId },
		);
		return Number(rows[0].count);
	}

	async function hasLabelColumn(context: TestMigrationContext): Promise<boolean> {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('skill_version')})`,
			);
			return rows.some((row) => row.name === 'label');
		}
		const rows: unknown[] = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}skill_version`, 'label'],
		);
		return rows.length > 0;
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('adds an empty label to existing versions and keeps their files', async () => {
		const versionId = await withContext(insertSkillWithFile);

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await hasLabelColumn(context)).toBe(true);
			const rows = await context.runQuery<Array<{ label: string | null }>>(
				`SELECT ${context.escape.columnName('label')} FROM ${context.escape.tableName('skill_version')}
				 WHERE ${context.escape.columnName('id')} = :versionId`,
				{ versionId },
			);
			expect(rows).toEqual([{ label: null }]);
			expect(await countFiles(context, versionId)).toBe(1);
		});
	});

	it('removes the column on revert and keeps the files', async () => {
		const versionId = await withContext(insertSkillWithFile);

		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await hasLabelColumn(context)).toBe(false);
			expect(await countFiles(context, versionId)).toBe(1);
		});
	});
});
