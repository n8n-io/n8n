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

const migrationName = 'AddIncludeAllProjectMembersToSelfHealingConfiguration1793106080688';
const linkedTables = [
	'self_healing_configuration_reviewer',
	'self_healing_configuration_workflow',
	'self_healing_investigation',
] as const;

describe('AddIncludeAllProjectMembersToSelfHealingConfiguration migration', () => {
	const userId = randomUUID();
	const versionId = randomUUID();

	async function withContext<T>(operation: (context: TestMigrationContext) => Promise<T>) {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await operation(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function countLinkedRows() {
		return await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			const counts: Record<string, number> = {};
			for (const table of linkedTables) {
				const [row] = await runQuery<Array<{ count: number | string }>>(
					`SELECT COUNT(*) AS ${c('count')} FROM ${t(table)}`,
				);
				counts[table] = Number(row.count);
			}
			return counts;
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('keeps existing configurations and their linked rows through apply and rollback', async () => {
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(`INSERT INTO ${t('user')} (${c('id')}) VALUES (:userId)`, { userId });
			await runQuery(
				`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
				 VALUES ('members-project', 'Review project', 'team')`,
			);
			await runQuery(
				`INSERT INTO ${t('workflow_entity')} (${c('id')}, ${c('name')}, ${c('active')}, ${c('versionId')}, ${c('nodes')}, ${c('connections')})
				 VALUES ('members-workflow', 'Review workflow', :active, :versionId, '[]', '{}')`,
				{ active: false, versionId },
			);
			await runQuery(
				`INSERT INTO ${t('self_healing_configuration')} (${c('projectId')}, ${c('scope')}, ${c('enabled')})
				 VALUES ('members-project', 'selected', :enabled)`,
				{ enabled: true },
			);
			const [{ id: configurationId }] = await runQuery<Array<{ id: number }>>(
				`SELECT ${c('id')} FROM ${t('self_healing_configuration')}`,
			);
			await runQuery(
				`INSERT INTO ${t('self_healing_configuration_reviewer')} (${c('configurationId')}, ${c('userId')})
				 VALUES (:configurationId, :userId)`,
				{ configurationId, userId },
			);
			await runQuery(
				`INSERT INTO ${t('self_healing_configuration_workflow')} (${c('configurationId')}, ${c('projectId')}, ${c('workflowId')})
				 VALUES (:configurationId, 'members-project', 'members-workflow')`,
				{ configurationId },
			);
			await runQuery(
				`INSERT INTO ${t('self_healing_investigation')}
				 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('executionId')}, ${c('threadId')}, ${c('runId')}, ${c('publishedVersionId')})
				 VALUES (:id, :configurationId, 'members-workflow', 'members-project', :userId, :executionId, :threadId, :runId, :versionId)`,
				{
					id: randomUUID(),
					configurationId,
					userId,
					executionId: randomUUID(),
					threadId: randomUUID(),
					runId: randomUUID(),
					versionId,
				},
			);
		});
		const linkedRows = Object.fromEntries(linkedTables.map((table) => [table, 1]));
		expect(await countLinkedRows()).toEqual(linkedRows);

		await runSingleMigration(migrationName);
		const [row] = await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) =>
				await runQuery<Array<{ includeAllProjectMembers: boolean | number }>>(
					`SELECT ${c('includeAllProjectMembers')} FROM ${t('self_healing_configuration')}
					 WHERE ${c('projectId')} = 'members-project'`,
				),
		);
		expect(Boolean(row.includeAllProjectMembers)).toBe(false);
		expect(await countLinkedRows()).toEqual(linkedRows);

		await undoLastSingleMigration();
		const remaining = await withContext(
			async ({ escape: { tableName: t }, runQuery }) =>
				await runQuery<Array<Record<string, unknown>>>(
					`SELECT * FROM ${t('self_healing_configuration')}`,
				),
		);
		expect(remaining).toHaveLength(1);
		expect(remaining[0]).not.toHaveProperty('includeAllProjectMembers');
		expect(await countLinkedRows()).toEqual(linkedRows);
	});
});
