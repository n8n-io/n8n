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

const migrationName = 'ReplaceSelfHealingInvestigationBaseline1792750863544';

describe('ReplaceSelfHealingInvestigationBaseline migration', () => {
	const userId = randomUUID();
	const versionId = randomUUID();
	const expectedBaseline = {
		savedVersionId: versionId,
		publishedVersionId: versionId,
		checksum: 'checksum',
		versionCounter: 1,
		latestPublishHistoryEventId: null,
	};
	const original = {
		name: 'Workflow',
		pinData: { Trigger: [{ json: { value: 'before\u0000after' } }] },
	};
	let configurationId: number;

	async function withContext<T>(operation: (context: TestMigrationContext) => Promise<T>) {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await operation(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertInvestigation(
		id: string,
		baselineColumns: Record<string, string>,
		resultId: string | null = null,
	) {
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			const columns = Object.keys(baselineColumns)
				.map((column) => `, ${c(column)}`)
				.join('');
			const values = Object.keys(baselineColumns)
				.map((column) => `, :${column}`)
				.join('');
			await runQuery(
				`INSERT INTO ${t('self_healing_investigation')}
				 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('executionId')}, ${c('threadId')}, ${c('runId')}, ${c('resultId')}, ${c('finishedAt')}${columns})
				 VALUES (:id, :configurationId, 'heal-workflow', 'heal-project', :userId, :executionId, :threadId, :runId, :resultId, :finishedAt${values})`,
				{
					id,
					configurationId,
					userId,
					executionId: `${id}-execution`,
					threadId: randomUUID(),
					runId: randomUUID(),
					resultId,
					finishedAt: resultId ? new Date() : null,
					...baselineColumns,
				},
			);
		});
	}

	async function selectIds(table: string) {
		return await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) =>
				await runQuery(`SELECT ${c('id')} FROM ${t(table)} ORDER BY ${c('id')}`),
		);
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);

		configurationId = await withContext(
			async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
				await runQuery(`INSERT INTO ${t('user')} (${c('id')}) VALUES (:userId)`, { userId });
				await runQuery(
					`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
					 VALUES ('heal-project', 'Self-healing project', 'team')`,
				);
				await runQuery(
					`INSERT INTO ${t('workflow_entity')} (${c('id')}, ${c('name')}, ${c('active')}, ${c('versionId')}, ${c('nodes')}, ${c('connections')})
					 VALUES ('heal-workflow', 'Self-healing workflow', :active, :versionId, '[]', '{}')`,
					{ active: false, versionId },
				);
				await runQuery(
					`INSERT INTO ${t('self_healing_configuration')} (${c('projectId')}, ${c('scope')}, ${c('enabled')})
					 VALUES ('heal-project', 'all', :enabled)`,
					{ enabled: true },
				);
				const [configuration] = await runQuery<Array<{ id: number }>>(
					`SELECT ${c('id')} FROM ${t('self_healing_configuration')}`,
				);
				await runQuery(
					`INSERT INTO ${t('self_healing_result')}
					 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('outcome')}, ${c('summary')}, ${c('report')}, ${c('completedAt')}, ${c('executionId')}, ${c('usage')})
					 VALUES ('result', :configurationId, 'heal-workflow', 'heal-project', :userId, 'could_not_fix', 'No fix.', 'The failure needs a person.', :completedAt, 'result-execution', :usage)`,
					{
						configurationId: configuration.id,
						userId,
						completedAt: new Date(),
						usage: JSON.stringify({ credits: 1, turns: 1, durationSeconds: 10 }),
					},
				);
				return configuration.id;
			},
		);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('clears investigations, keeps results, and stores the published version', async () => {
		const oldBaseline = {
			baseline: JSON.stringify({
				workflowId: 'heal-workflow',
				projectId: 'heal-project',
				backgroundUserId: userId,
				expectedBaseline,
				original,
			}),
		};
		await insertInvestigation('finished', oldBaseline, 'result');
		await insertInvestigation('unfinished', oldBaseline);

		await runSingleMigration(migrationName);
		expect(await selectIds('self_healing_investigation')).toEqual([]);
		expect(await selectIds('self_healing_result')).toEqual([{ id: 'result' }]);

		await insertInvestigation('replaced', { publishedVersionId: versionId }, 'result');
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			expect(
				await runQuery(`SELECT ${c('publishedVersionId')} FROM ${t('self_healing_investigation')}`),
			).toEqual([{ publishedVersionId: versionId }]);
		});

		await undoLastSingleMigration();
		expect(await selectIds('self_healing_investigation')).toEqual([]);
		expect(await selectIds('self_healing_result')).toEqual([{ id: 'result' }]);
		await insertInvestigation('restored', oldBaseline);

		await runSingleMigration(migrationName);
		expect(await selectIds('self_healing_investigation')).toEqual([]);
		expect(await selectIds('self_healing_result')).toEqual([{ id: 'result' }]);
	});
});
