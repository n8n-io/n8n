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

const migrationName = 'LinkWorkflowSuggestionsToSelfHealingResult1793288106000';
const tables = [
	'self_healing_investigation',
	'self_healing_result',
	'workflow_suggestion_activity',
	'workflow_suggestion',
];

describe('LinkWorkflowSuggestionsToSelfHealingResult migration', () => {
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

	async function seedOwners({
		escape: { tableName: t, columnName: c },
		runQuery,
	}: TestMigrationContext) {
		await runQuery(`INSERT INTO ${t('user')} (${c('id')}) VALUES (:userId)`, { userId });
		await runQuery(
			`INSERT INTO ${t('project')} (${c('id')}, ${c('name')}, ${c('type')})
			 VALUES ('project', 'Project', 'team')`,
		);
		await runQuery(
			`INSERT INTO ${t('workflow_entity')} (${c('id')}, ${c('name')}, ${c('active')}, ${c('versionId')}, ${c('nodes')}, ${c('connections')})
			 VALUES ('workflow', 'Workflow', :active, :versionId, '[]', '{}')`,
			{ active: false, versionId },
		);
		await runQuery(
			`INSERT INTO ${t('self_healing_configuration')} (${c('id')}, ${c('projectId')}, ${c('scope')}, ${c('enabled')})
			 VALUES (1, 'project', 'all', :enabled)`,
			{ enabled: true },
		);
	}

	async function seedOldReview(context: TestMigrationContext) {
		const {
			escape: { tableName: t, columnName: c },
			runQuery,
		} = context;
		await runQuery(
			`INSERT INTO ${t('workflow_suggestion')}
			 (${c('id')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('expectedBaseline')}, ${c('state')}, ${c('payload')}, ${c('resultKind')})
			 VALUES ('suggestion', 'workflow', 'project', :userId, '{}', 'pending', '{}', 'fix_ready')`,
			{ userId },
		);
		await runQuery(
			`INSERT INTO ${t('self_healing_result')}
			 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('outcome')}, ${c('summary')}, ${c('report')}, ${c('completedAt')}, ${c('executionId')}, ${c('usage')}, ${c('suggestionId')})
			 VALUES ('result', 1, 'workflow', 'project', :userId, 'fix_ready', 'Summary', 'Report', :now, 'execution', '{}', 'suggestion')`,
			{ userId, now: new Date() },
		);
		await seedActivityAndInvestigation(context);
	}

	async function seedNewReview(context: TestMigrationContext) {
		const {
			escape: { tableName: t, columnName: c },
			runQuery,
		} = context;
		await runQuery(
			`INSERT INTO ${t('self_healing_result')}
			 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('outcome')}, ${c('summary')}, ${c('report')}, ${c('completedAt')}, ${c('executionId')}, ${c('usage')}, ${c('reviewState')})
			 VALUES ('result', 1, 'workflow', 'project', :userId, 'fix_ready', 'Summary', 'Report', :now, 'execution', '{}', 'applied')`,
			{ userId, now: new Date() },
		);
		await runQuery(
			`INSERT INTO ${t('workflow_suggestion')}
			 (${c('id')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('expectedBaseline')}, ${c('state')}, ${c('payload')}, ${c('resultKind')}, ${c('selfHealingResultId')})
			 VALUES ('suggestion', 'workflow', 'project', :userId, '{}', 'pending', '{}', 'fix_ready', 'result')`,
			{ userId },
		);
		await seedActivityAndInvestigation(context);
	}

	async function seedActivityAndInvestigation({
		escape: { tableName: t, columnName: c },
		runQuery,
	}: TestMigrationContext) {
		await runQuery(
			`INSERT INTO ${t('workflow_suggestion_activity')} (${c('id')}, ${c('suggestionId')}, ${c('action')}, ${c('author')})
			 VALUES ('activity', 'suggestion', 'submitted', 'assistant')`,
		);
		await runQuery(
			`INSERT INTO ${t('self_healing_investigation')}
			 (${c('id')}, ${c('configurationId')}, ${c('workflowId')}, ${c('projectId')}, ${c('backgroundUserId')}, ${c('executionId')}, ${c('threadId')}, ${c('runId')}, ${c('publishedVersionId')}, ${c('resultId')})
			 VALUES ('investigation', 1, 'workflow', 'project', :userId, 'execution', :threadId, :runId, :versionId, 'result')`,
			{ userId, threadId: randomUUID(), runId: randomUUID(), versionId },
		);
	}

	async function counts({ escape: { tableName: t }, runQuery }: TestMigrationContext) {
		const result: Record<string, number> = {};
		for (const table of tables) {
			const [{ count }] = await runQuery<Array<{ count: number | string }>>(
				`SELECT COUNT(*) AS count FROM ${t(table)}`,
			);
			result[table] = Number(count);
		}
		return result;
	}

	const empty = Object.fromEntries(tables.map((table) => [table, 0]));
	const seeded = Object.fromEntries(tables.map((table) => [table, 1]));

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		await withContext(seedOwners);
	});

	afterAll(async () => await Container.get(DbConnection).close());

	it('deletes self-healing review data in both directions', async () => {
		await withContext(async (context) => {
			await seedOldReview(context);
			expect(await counts(context)).toEqual(seeded);
		});

		await runSingleMigration(migrationName);
		await withContext(async (context) => {
			expect(await counts(context)).toEqual(empty);
			await seedNewReview(context);
			expect(await counts(context)).toEqual(seeded);
		});

		await undoLastSingleMigration();
		await withContext(async (context) => {
			expect(await counts(context)).toEqual(empty);
			await seedOldReview(context);
			expect(await counts(context)).toEqual(seeded);
		});
	});
});
