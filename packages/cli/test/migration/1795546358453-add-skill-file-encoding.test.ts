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

const MIGRATION_NAME = 'AddSkillFileEncoding1795546358453';

describe('AddSkillFileEncoding migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insert(
		context: TestMigrationContext,
		table: string,
		row: Record<string, unknown>,
	) {
		const stamped = { ...row, createdAt: new Date(), updatedAt: new Date() };
		const keys = Object.keys(stamped);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${keys
				.map((key) => context.escape.columnName(key))
				.join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
			stamped,
		);
	}

	async function insertVersion(context: TestMigrationContext) {
		const skillVersionId = randomUUID();
		await insert(context, 'skill', { id: 'skill_example', source: 'ui' });
		await insert(context, 'skill_version', {
			id: skillVersionId,
			skillId: 'skill_example',
			version: 1,
			name: 'Example',
			description: 'Example',
			instructions: 'Example',
			contentHash: 'a'.repeat(64),
		});
		return skillVersionId;
	}

	async function files(context: TestMigrationContext) {
		return await context.runQuery<Array<Record<string, unknown>>>(
			`SELECT * FROM ${context.escape.tableName('skill_file')} ORDER BY ${context.escape.columnName('path')}`,
		);
	}

	it('marks the files of earlier versions as text', async () => {
		const before = createTestMigrationContext(dataSource);
		const skillVersionId = await insertVersion(before);
		await insert(before, 'skill_file', {
			skillVersionId,
			path: 'references/guide.md',
			content: '# Guide',
		});
		await before.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		const after = createTestMigrationContext(dataSource);
		const [file] = await files(after);
		expect(file.content).toBe('# Guide');
		expect(Boolean(file.isBinary)).toBe(false);
		await after.queryRunner.release();
	});

	it('removes the column and the binary files on revert, and keeps the text files', async () => {
		await runSingleMigration(MIGRATION_NAME);
		const before = createTestMigrationContext(dataSource);
		const skillVersionId = await insertVersion(before);
		await insert(before, 'skill_file', {
			skillVersionId,
			path: 'references/guide.md',
			content: '# Guide',
			isBinary: false,
		});
		await insert(before, 'skill_file', {
			skillVersionId,
			path: 'assets/logo.png',
			content: 'AP8=',
			isBinary: true,
		});
		await before.queryRunner.release();

		await undoLastSingleMigration();

		const after = createTestMigrationContext(dataSource);
		const rows = await files(after);
		expect(rows.map((row) => row.path)).toEqual(['references/guide.md']);
		expect(rows[0].content).toBe('# Guide');
		expect(rows[0]).not.toHaveProperty('isBinary');
		await after.queryRunner.release();
	});
});
