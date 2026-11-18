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

const migration = 'AddSkillSourceUnlinkedSkills1795005085247';

describe('Skill source unlinked skills migration', () => {
	let context: TestMigrationContext;
	beforeAll(async () => {
		await Container.get(DbConnection).init();
		context = createTestMigrationContext(Container.get(DataSource));
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
	});
	afterAll(async () => {
		await context?.queryRunner.release();
		await Container.get(DbConnection).close();
	});
	it('preserves sources and links through up, down, and up', async () => {
		const table = context.escape.tableName('skill_source');
		const links = context.escape.tableName('skill_source_link');
		const col = context.escape.columnName;
		const sourceId = '019a7d20-0000-7000-8000-000000000001';
		await context.runQuery(
			`INSERT INTO ${table} (${col('id')}, ${col('type')}, ${col('locator')}, ${col('identityKey')}) VALUES ('${sourceId}', 'github', '{}', 'test-source')`,
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('skill')} (${col('id')}, ${col('source')}) VALUES ('skill_test', 'github')`,
		);
		await context.runQuery(
			`INSERT INTO ${links} (${col('skillId')}, ${col('sourceId')}, ${col('remoteRef')}, ${col('baseRevision')}, ${col('baseContentHash')}, ${col('skippedFiles')}) VALUES ('skill_test', '${sourceId}', '{}', 'revision', '${'a'.repeat(64)}', '[]')`,
		);
		await context.queryRunner.release();
		await runSingleMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
		expect(await context.runQuery(`SELECT ${col('unlinkedSkills')} FROM ${table}`)).toEqual([
			{ unlinkedSkills: null },
		]);
		await context.runQuery(`UPDATE ${table} SET ${col('unlinkedSkills')} = :skills`, {
			skills: JSON.stringify([
				{ key: 'new-skill', contentHash: 'b'.repeat(64), verdict: 'pass', skipped: true },
			]),
		});
		await context.queryRunner.release();
		await undoLastSingleMigration();
		await runSingleMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
		expect(
			await context.runQuery(`SELECT ${col('id')}, ${col('unlinkedSkills')} FROM ${table}`),
		).toEqual([{ id: sourceId, unlinkedSkills: null }]);
		expect(await context.runQuery(`SELECT ${col('skillId')} FROM ${links}`)).toEqual([
			{ skillId: 'skill_test' },
		]);
	});
});
