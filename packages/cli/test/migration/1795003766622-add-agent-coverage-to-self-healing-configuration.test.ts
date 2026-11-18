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

const migrationName = 'AddAgentCoverageToSelfHealingConfiguration1795003766622';
const linkedTables = [
	'self_healing_configuration_reviewer',
	'self_healing_configuration_workflow',
	'self_healing_investigation',
] as const;
const agentColumns = [
	'agentScope',
	'agentGoals',
	'agentScheduleIntervalHours',
	'agentTraceThreshold',
	'agentPublicationMode',
] as const;

describe('AddAgentCoverageToSelfHealingConfiguration migration', () => {
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

	async function configurationRows() {
		return await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) =>
				await runQuery<Array<Record<string, unknown>>>(
					`SELECT * FROM ${t('self_healing_configuration')} WHERE ${c('projectId')} = 'coverage-project'`,
				),
		);
	}

	/** PostgreSQL index introspection does not preserve the column order. */
	async function indexColumns(tableName: string) {
		return await withContext(async ({ queryRunner, tablePrefix }) => {
			const table = await queryRunner.getTable(`${tablePrefix}${tableName}`);
			return table?.indices.map(({ columnNames }) => columnNames.toSorted());
		});
	}

	async function insertConfiguration(agentScope: string) {
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(
				`INSERT INTO ${t('self_healing_configuration')} (${c('projectId')}, ${c('scope')}, ${c('enabled')}, ${c('agentScope')})
				 VALUES ('coverage-project', 'selected', :enabled, :agentScope)`,
				{ enabled: false, agentScope },
			);
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('keeps existing configurations and their linked rows through apply and rollback', async () => {
		const configurationId = await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
				await runQuery(`INSERT INTO ${t('user')} (${c('id')}) VALUES (:userId)`, { userId });
				await runQuery(
					`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
					 VALUES ('coverage-project', 'Review project', 'team')`,
				);
				await runQuery(
					`INSERT INTO ${t('workflow_entity')} (${c('id')}, ${c('name')}, ${c('active')}, ${c('versionId')}, ${c('nodes')}, ${c('connections')})
					 VALUES ('coverage-workflow', 'Review workflow', :active, :versionId, '[]', '{}')`,
					{ active: false, versionId },
				);
				await runQuery(
					`INSERT INTO ${t('agents')} (${c('id')}, ${c('name')}, ${c('projectId')})
					 VALUES ('coverage-agent', 'Support agent', 'coverage-project')`,
				);
				await runQuery(
					`INSERT INTO ${t('self_healing_configuration')} (${c('projectId')}, ${c('scope')}, ${c('enabled')})
					 VALUES ('coverage-project', 'all', :enabled)`,
					{ enabled: true },
				);
				const [{ id }] = await runQuery<Array<{ id: number }>>(
					`SELECT ${c('id')} FROM ${t('self_healing_configuration')}`,
				);
				await runQuery(
					`INSERT INTO ${t('self_healing_configuration_reviewer')} (${c('configurationId')}, ${c('userId')})
					 VALUES (:id, :userId)`,
					{ id, userId },
				);
				await runQuery(
					`INSERT INTO ${t('self_healing_configuration_workflow')} (${c('configurationId')}, ${c('projectId')}, ${c('workflowId')})
					 VALUES (:id, 'coverage-project', 'coverage-workflow')`,
					{ id },
				);
				await runQuery(
					`INSERT INTO ${t('self_healing_investigation')}
					 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('executionId')}, ${c('threadId')}, ${c('runId')}, ${c('publishedVersionId')})
					 VALUES (:investigationId, :id, 'coverage-workflow', 'coverage-project', :userId, :executionId, :threadId, :runId, :versionId)`,
					{
						investigationId: randomUUID(),
						id,
						userId,
						executionId: randomUUID(),
						threadId: randomUUID(),
						runId: randomUUID(),
						versionId,
					},
				);
				return id;
			},
		);
		const linkedRows = Object.fromEntries(linkedTables.map((table) => [table, 1]));
		expect(await countLinkedRows()).toEqual(linkedRows);

		await runSingleMigration(migrationName);

		// An existing configuration covers no agent.
		const migrated = await configurationRows();
		// SQLite returns the JSON list as text.
		const { agentGoals } = migrated[0];
		expect(typeof agentGoals === 'string' ? JSON.parse(agentGoals) : agentGoals).toEqual([
			'quality',
		]);
		expect(migrated).toEqual([
			expect.objectContaining({
				agentScope: 'none',
				agentScheduleIntervalHours: null,
				agentTraceThreshold: null,
				agentPublicationMode: 'approval',
			}),
		]);
		expect(await countLinkedRows()).toEqual(linkedRows);

		// A project has at most one all-agents configuration.
		await insertConfiguration('all');
		await expect(insertConfiguration('all')).rejects.toThrow();
		await insertConfiguration('selected');

		// An agent belongs to at most one configuration of a project.
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			const rows = await runQuery<Array<{ id: number }>>(
				`SELECT ${c('id')} FROM ${t('self_healing_configuration')} WHERE ${c('agentScope')} <> 'none' ORDER BY ${c('id')}`,
			);
			const insertSelection = async (id: number) =>
				await runQuery(
					`INSERT INTO ${t('self_healing_configuration_agent')} (${c('configurationId')}, ${c('agentId')}, ${c('projectId')})
					 VALUES (:id, 'coverage-agent', 'coverage-project')`,
					{ id },
				);
			await insertSelection(rows[1].id);
			await expect(insertSelection(rows[0].id)).rejects.toThrow();

			// The selection follows the agent.
			await runQuery(`DELETE FROM ${t('agents')} WHERE ${c('id')} = 'coverage-agent'`);
			expect(await runQuery(`SELECT * FROM ${t('self_healing_configuration_agent')}`)).toEqual([]);

			// The rollback can only restore configurations that the old schema accepts.
			await runQuery(
				`DELETE FROM ${t('self_healing_configuration')} WHERE ${c('id')} <> :configurationId`,
				{ configurationId },
			);
		});
		expect(await indexColumns('self_healing_configuration_agent')).toEqual(
			expect.arrayContaining([['agentId'], ['agentId', 'projectId']]),
		);

		await undoLastSingleMigration();

		const remaining = await configurationRows();
		expect(remaining).toHaveLength(1);
		for (const column of agentColumns) expect(remaining[0]).not.toHaveProperty(column);
		expect(await countLinkedRows()).toEqual(linkedRows);
		expect(await indexColumns('self_healing_configuration_agent')).toBeUndefined();
		// The rollback keeps the all-workflows index, which has the default name on `projectId`.
		await expect(
			withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
				await runQuery(
					`INSERT INTO ${t('self_healing_configuration')} (${c('projectId')}, ${c('scope')}, ${c('enabled')})
					 VALUES ('coverage-project', 'all', :enabled)`,
					{ enabled: false },
				);
			}),
		).rejects.toThrow();

		await runSingleMigration(migrationName);
		expect(await configurationRows()).toEqual([expect.objectContaining({ agentScope: 'none' })]);
		expect(await countLinkedRows()).toEqual(linkedRows);
	});
});
