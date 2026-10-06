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

const migrationName = 'CreateSelfHealingResultTable1791305991901';

describe('CreateSelfHealingResultTable migration', () => {
	async function withContext(operation: (context: TestMigrationContext) => Promise<void>) {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			await operation(context);
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

	it('preserves suggestion and activity rows through apply, rollback, and reapply', async () => {
		const userId = randomUUID();
		const versionId = randomUUID();
		const now = new Date();
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(`INSERT INTO ${t('user')} (${c('id')}) VALUES (:userId)`, { userId });
			await runQuery(
				`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
				 VALUES ('result-project', 'Review project', 'team')`,
			);
			await runQuery(
				`INSERT INTO ${t('workflow_entity')} (${c('id')}, ${c('name')}, ${c('active')}, ${c('versionId')}, ${c('nodes')}, ${c('connections')})
				 VALUES ('result-workflow', 'Review workflow', :active, :versionId, '[]', '{}')`,
				{ active: false, versionId },
			);
			await runQuery(
				`INSERT INTO ${t('workflow_suggestion')}
				 (${c('id')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('expectedBaseline')}, ${c('state')}, ${c('payload')}, ${c('resultKind')})
				 VALUES ('result-suggestion', 'result-workflow', 'result-project', :userId, :baseline, 'pending', :payload, 'fix_ready')`,
				{
					userId,
					baseline: JSON.stringify({
						savedVersionId: versionId,
						publishedVersionId: versionId,
						checksum: 'checksum',
						versionCounter: 1,
						latestPublishHistoryEventId: null,
					}),
					payload: JSON.stringify({ original: {}, candidate: {}, explanation: 'Review the fix.' }),
				},
			);
			await runQuery(
				`INSERT INTO ${t('workflow_suggestion_activity')} (${c('id')}, ${c('suggestionId')}, ${c('action')}, ${c('author')})
				 VALUES ('result-activity', 'result-suggestion', 'submitted', 'assistant')`,
			);
		});

		await runSingleMigration(migrationName);
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			await runQuery(
				`INSERT INTO ${t('self_healing_result')}
				 (${c('id')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('outcome')}, ${c('summary')}, ${c('report')}, ${c('completedAt')}, ${c('suggestionId')}, ${c('executionId')}, ${c('usage')})
				 VALUES ('result', 'result-workflow', 'result-project', :userId, 'fix_ready', 'Prepared a fix.', 'Review the fix.', :now, 'result-suggestion', 'pruned-execution', :usage)`,
				{
					userId,
					now,
					usage: JSON.stringify({
						credits: 1,
						turns: 2,
						durationSeconds: 30,
						promptTokens: 1000,
						completionTokens: 200,
						totalTokens: 1200,
					}),
				},
			);
		});

		await undoLastSingleMigration();
		await withContext(async ({ escape: { tableName: t, columnName: c }, runQuery }) => {
			expect(await runQuery(`SELECT ${c('id')} FROM ${t('workflow_suggestion')}`)).toEqual([
				{ id: 'result-suggestion' },
			]);
			expect(await runQuery(`SELECT ${c('id')} FROM ${t('workflow_suggestion_activity')}`)).toEqual(
				[{ id: 'result-activity' }],
			);
		});

		await runSingleMigration(migrationName);
		await withContext(async ({ escape: { tableName: t }, runQuery }) => {
			expect(await runQuery(`SELECT * FROM ${t('self_healing_result')}`)).toEqual([]);
		});
	});
});
