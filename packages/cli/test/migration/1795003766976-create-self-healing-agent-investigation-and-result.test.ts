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

const migrationName = 'CreateSelfHealingAgentInvestigationAndResult1795003766976';

describe('CreateSelfHealingAgentInvestigationAndResult migration', () => {
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

	async function insertResult(id: string, agentId = 'proposal-agent') {
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(
				`INSERT INTO ${t('self_healing_agent_result')}
				 (${c('id')}, ${c('configurationId')}, ${c('projectId')}, ${c('agentId')}, ${c('agentName')}, ${c('backgroundUserId')}, ${c('baseVersionId')}, ${c('goals')}, ${c('trigger')}, ${c('traceWindowEnd')}, ${c('summary')}, ${c('report')}, ${c('edits')}, ${c('evalCases')}, ${c('usage')}, ${c('applyProgress')})
				 VALUES (:id, 1, 'proposal-project', :agentId, 'Support agent', :userId, :versionId, '["quality"]', 'manual', :now, 'Summary', 'Report', '[]', '[]', '{}', '{}')`,
				{ id, agentId, userId, versionId, now: new Date() },
			);
		});
	}

	async function insertInvestigation(
		id: string,
		fields: { trigger?: string; outcome?: string | null; resultId?: string | null } = {},
	) {
		const { trigger = 'schedule', outcome = null, resultId = null } = fields;
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(
				`INSERT INTO ${t('self_healing_agent_investigation')}
				 (${c('id')}, ${c('configurationId')}, ${c('projectId')}, ${c('agentId')}, ${c('backgroundUserId')}, ${c('trigger')}, ${c('agentVersionId')}, ${c('traceWindowEnd')}, ${c('threadId')}, ${c('runId')}, ${c('outcome')}, ${c('resultId')}, ${c('finishedAt')})
				 VALUES (:id, 1, 'proposal-project', 'proposal-agent', :userId, :trigger, :versionId, :now, :threadId, :runId, :outcome, :resultId, :finishedAt)`,
				{
					id,
					userId,
					trigger,
					versionId,
					now: new Date(),
					threadId: randomUUID(),
					runId: randomUUID(),
					outcome,
					resultId,
					finishedAt: outcome === null ? null : new Date(),
				},
			);
		});
	}

	async function selectAll(tableName: string) {
		return await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) =>
				await runQuery<Array<Record<string, unknown>>>(
					`SELECT * FROM ${t(tableName)} ORDER BY ${c('id')}`,
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

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(`INSERT INTO ${t('user')} (${c('id')}) VALUES (:userId)`, { userId });
			await runQuery(
				`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
				 VALUES ('proposal-project', 'Review project', 'team')`,
			);
			await runQuery(
				`INSERT INTO ${t('agents')} (${c('id')}, ${c('name')}, ${c('projectId')})
				 VALUES ('proposal-agent', 'Support agent', 'proposal-project')`,
			);
			await runQuery(
				`INSERT INTO ${t('self_healing_configuration')} (${c('id')}, ${c('projectId')}, ${c('scope')}, ${c('enabled')}, ${c('agentScope')})
				 VALUES (1, 'proposal-project', 'selected', :enabled, 'all')`,
				{ enabled: true },
			);
		});
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('creates both tables with their defaults, checks and indexes', async () => {
		await runSingleMigration(migrationName);

		await insertResult('result-1');
		expect(await selectAll('self_healing_agent_result')).toEqual([
			expect.objectContaining({
				id: 'result-1',
				reviewState: 'open',
				traceCount: 0,
				traceWindowStart: null,
				evidence: null,
				publishedVersionId: null,
				applyError: null,
				applyStartedAt: null,
				closedAt: null,
				closedById: null,
			}),
		]);
		const [result] = await selectAll('self_healing_agent_result');
		expect(Boolean(result.appliedAutomatically)).toBe(false);

		await insertInvestigation('investigation-1', { outcome: 'proposal', resultId: 'result-1' });
		// An agent has at most one unfinished investigation.
		await insertInvestigation('investigation-2');
		await expect(insertInvestigation('investigation-3')).rejects.toThrow();
		await expect(
			insertInvestigation('investigation-4', { trigger: 'unknown', outcome: 'failed' }),
		).rejects.toThrow();
		await expect(insertInvestigation('investigation-5', { outcome: 'unknown' })).rejects.toThrow();

		expect(await indexColumns('self_healing_agent_result')).toEqual(
			expect.arrayContaining([
				['projectId', 'reviewState'],
				['agentId', 'reviewState'],
				['configurationId', 'updatedAt'],
			]),
		);
		expect(await indexColumns('self_healing_agent_investigation')).toEqual(
			expect.arrayContaining([
				['agentId'],
				['agentId', 'createdAt'],
				['configurationId', 'createdAt'],
			]),
		);
	});

	it('keeps a finished investigation when its proposal is deleted', async () => {
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(`DELETE FROM ${t('self_healing_agent_result')} WHERE ${c('id')} = 'result-1'`);
		});
		expect(await selectAll('self_healing_agent_investigation')).toEqual([
			expect.objectContaining({ id: 'investigation-1', outcome: 'proposal', resultId: null }),
			expect.objectContaining({ id: 'investigation-2', outcome: null }),
		]);
	});

	it('removes proposals and investigations with their agent', async () => {
		await insertResult('result-2');
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(`DELETE FROM ${t('agents')} WHERE ${c('id')} = 'proposal-agent'`);
		});
		expect(await selectAll('self_healing_agent_result')).toEqual([]);
		expect(await selectAll('self_healing_agent_investigation')).toEqual([]);
	});

	it('keeps configurations through rollback and reapply', async () => {
		await undoLastSingleMigration();
		expect(await indexColumns('self_healing_agent_result')).toBeUndefined();
		expect(await indexColumns('self_healing_agent_investigation')).toBeUndefined();
		expect(await selectAll('self_healing_configuration')).toHaveLength(1);

		await runSingleMigration(migrationName);
		expect(await selectAll('self_healing_agent_result')).toEqual([]);
		expect(await selectAll('self_healing_agent_investigation')).toEqual([]);
		expect(await selectAll('self_healing_configuration')).toHaveLength(1);
	});
});
