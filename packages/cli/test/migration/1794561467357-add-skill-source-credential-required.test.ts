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

const migration = 'AddSkillSourceCredentialRequired1794561467357';

describe('Skill source credential requirement migration', () => {
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

	it('keeps credential requirements after deletion and preserves source links through up/down/up', async () => {
		const table = context.escape.tableName('skill_source');
		const links = context.escape.tableName('skill_source_link');
		const credentials = context.escape.tableName('credentials_entity');
		const col = context.escape.columnName;
		const privateId = '019a7d20-0000-7000-8000-000000000001';
		const publicId = '019a7d20-0000-7000-8000-000000000002';
		await context.runQuery(
			`INSERT INTO ${credentials} (${col('id')}, ${col('name')}, ${col('type')}, ${col('data')}) VALUES ('github', 'GitHub', 'githubApi', 'encrypted')`,
		);
		for (const [id, credential] of [
			[privateId, "'github'"],
			[publicId, 'NULL'],
		]) {
			await context.runQuery(
				`INSERT INTO ${table} (${col('id')}, ${col('type')}, ${col('locator')}, ${col('identityKey')}, ${col('credentialId')}) VALUES ('${id}', 'github', '{}', '${id}', ${credential})`,
			);
		}
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('skill')} (${col('id')}, ${col('source')}) VALUES ('skill_test', 'github')`,
		);
		await context.runQuery(
			`INSERT INTO ${links} (${col('skillId')}, ${col('sourceId')}, ${col('remoteRef')}, ${col('baseRevision')}, ${col('baseContentHash')}, ${col('skippedFiles')}) VALUES ('skill_test', '${privateId}', '{}', 'revision', '${'a'.repeat(64)}', '[]')`,
		);
		await context.queryRunner.release();
		await runSingleMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
		const readRequired = async () =>
			await context.runQuery<Array<{ id: string; credentialRequired: boolean | number }>>(
				`SELECT ${col('id')}, ${col('credentialRequired')} FROM ${table} ORDER BY ${col('id')}`,
			);
		expect(
			(await readRequired()).map(({ credentialRequired }) => Boolean(credentialRequired)),
		).toEqual([true, false]);
		await context.queryRunner.release();
		await undoLastSingleMigration();
		await runSingleMigration(migration);
		context = createTestMigrationContext(Container.get(DataSource));
		expect(
			(await readRequired()).map(({ credentialRequired }) => Boolean(credentialRequired)),
		).toEqual([true, false]);
		expect(await context.runQuery(`SELECT ${col('skillId')} FROM ${links}`)).toEqual([
			{ skillId: 'skill_test' },
		]);
		await context.runQuery(`DELETE FROM ${credentials} WHERE ${col('id')} = 'github'`);
		expect((await readRequired())[0].credentialRequired).toBeTruthy();
		expect(
			await context.runQuery(
				`SELECT ${col('credentialId')} FROM ${table} WHERE ${col('id')} = '${privateId}'`,
			),
		).toEqual([{ credentialId: null }]);
	});
});
