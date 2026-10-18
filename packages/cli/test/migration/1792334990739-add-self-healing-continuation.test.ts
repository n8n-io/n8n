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

const migration = 'AddSelfHealingContinuation1792334990739';

describe('Self-healing continuation migration', () => {
	const investigatorId = randomUUID();
	const reviewerId = randomUUID();
	const projectId = randomUUID();
	const workflowId = randomUUID();
	const resultId = randomUUID();
	const suggestionId = randomUUID();
	const activityId = randomUUID();
	const suggestionPayload = { explanation: 'Review the source data mapping.' };

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await withContext(async (context) => {
			await insert(context, 'user', { id: investigatorId });
			await insert(context, 'user', { id: reviewerId });
			await insert(context, 'project', {
				id: projectId,
				name: 'Continuation test',
				type: 'personal',
			});
			await insert(context, 'self_healing_configuration', {
				projectId,
				scope: 'all',
			});
			const [configuration] = await context.runQuery<Array<{ id: number }>>(
				`SELECT ${context.escape.columnName('id')} FROM ${context.escape.tableName('self_healing_configuration')}`,
			);
			await insert(context, 'workflow_entity', {
				id: workflowId,
				name: 'Continuation test',
				active: false,
				versionId: randomUUID(),
				nodes: '[]',
				connections: '{}',
			});
			await insert(context, 'self_healing_result', {
				id: resultId,
				configurationId: configuration.id,
				workflowId,
				projectId,
				backgroundUserId: investigatorId,
				outcome: 'needs_you',
				summary: 'Check the source data',
				report: 'The request has no order number.',
				completedAt: '2026-10-09T12:00:00.000Z',
				executionId: 'retained-execution',
				usage: '{}',
			});
			await insert(context, 'workflow_suggestion', {
				id: suggestionId,
				selfHealingResultId: resultId,
				workflowId,
				projectId,
				backgroundUserId: investigatorId,
				expectedBaseline: '{}',
				state: 'pending',
				payload: JSON.stringify(suggestionPayload),
				resultKind: 'needs_you',
			});
			await insert(context, 'workflow_suggestion_activity', {
				id: activityId,
				suggestionId,
				action: 'submitted',
				author: 'assistant',
			});
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insert(
		context: TestMigrationContext,
		table: string,
		values: Record<string, string | number | boolean>,
	) {
		const names = Object.keys(values);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${names.map(context.escape.columnName).join(', ')})
			 VALUES (${names.map((name) => `:${name}`).join(', ')})`,
			values,
		);
	}

	async function expectSavedData(context: TestMigrationContext) {
		const table = context.escape.tableName;
		const column = context.escape.columnName;
		const results = await context.runQuery<Array<{ summary: string; report: string }>>(
			`SELECT ${column('summary')}, ${column('report')} FROM ${table('self_healing_result')}
			 WHERE ${column('id')} = :resultId`,
			{ resultId },
		);
		expect(results).toEqual([
			{ summary: 'Check the source data', report: 'The request has no order number.' },
		]);
		const suggestions = await context.runQuery<
			Array<{ selfHealingResultId: string; payload: string | typeof suggestionPayload }>
		>(
			`SELECT ${column('selfHealingResultId')}, ${column('payload')} FROM ${table('workflow_suggestion')}
			 WHERE ${column('id')} = :suggestionId`,
			{ suggestionId },
		);
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].selfHealingResultId).toBe(resultId);
		const payload = suggestions[0].payload;
		expect(typeof payload === 'string' ? JSON.parse(payload) : payload).toEqual(suggestionPayload);
		const activity = await context.runQuery<Array<{ suggestionId: string; action: string }>>(
			`SELECT ${column('suggestionId')}, ${column('action')} FROM ${table('workflow_suggestion_activity')}
			 WHERE ${column('id')} = :activityId`,
			{ activityId },
		);
		expect(activity).toEqual([{ suggestionId, action: 'submitted' }]);
	}

	it('preserves reports and their suggestions across migration, rollback, and reapplication', async () => {
		await runSingleMigration(migration);
		await withContext(expectSavedData);
		await undoLastSingleMigration();
		await withContext(expectSavedData);
		await runSingleMigration(migration);
		await withContext(expectSavedData);

		await withContext(async (context) => {
			const table = context.escape.tableName;
			const column = context.escape.columnName;
			await context.runQuery(
				`UPDATE ${table('self_healing_result')} SET ${column('continuedAt')} = CURRENT_TIMESTAMP,
			 ${column('continuedById')} = :reviewerId WHERE ${column('id')} = :resultId`,
				{ reviewerId, resultId },
			);
			await context.runQuery(`DELETE FROM ${table('user')} WHERE ${column('id')} = :reviewerId`, {
				reviewerId,
			});
			const [result] = await context.runQuery<
				Array<{
					continuedAt: unknown;
					continuedById: string | null;
				}>
			>(
				`SELECT ${column('continuedAt')}, ${column('continuedById')}
			 FROM ${table('self_healing_result')} WHERE ${column('id')} = :resultId`,
				{ resultId },
			);
			expect(result.continuedAt).not.toBeNull();
			expect(result.continuedById).toBeNull();
		});
	});
});
