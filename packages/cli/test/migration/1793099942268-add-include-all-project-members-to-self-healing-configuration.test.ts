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

const migrationName = 'AddIncludeAllProjectMembersToSelfHealingConfiguration1793099942268';

describe('AddIncludeAllProjectMembersToSelfHealingConfiguration migration', () => {
	async function withContext<T>(operation: (context: TestMigrationContext) => Promise<T>) {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await operation(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('keeps existing configurations on individual reviewers through apply and rollback', async () => {
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(
				`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
				 VALUES ('members-project', 'Review project', 'team')`,
			);
			await runQuery(
				`INSERT INTO ${t('self_healing_configuration')} (${c('projectId')}, ${c('scope')}, ${c('enabled')})
				 VALUES ('members-project', 'all', :enabled)`,
				{ enabled: true },
			);
		});

		await runSingleMigration(migrationName);
		const [row] = await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) =>
				await runQuery<Array<{ includeAllProjectMembers: boolean | number }>>(
					`SELECT ${c('includeAllProjectMembers')} FROM ${t('self_healing_configuration')}
					 WHERE ${c('projectId')} = 'members-project'`,
				),
		);
		expect(Boolean(row.includeAllProjectMembers)).toBe(false);

		await undoLastSingleMigration();
		const remaining = await withContext(
			async ({ escape: { tableName: t }, runQuery }) =>
				await runQuery<Array<Record<string, unknown>>>(
					`SELECT * FROM ${t('self_healing_configuration')}`,
				),
		);
		expect(remaining).toHaveLength(1);
		expect(remaining[0]).not.toHaveProperty('includeAllProjectMembers');
	});
});
