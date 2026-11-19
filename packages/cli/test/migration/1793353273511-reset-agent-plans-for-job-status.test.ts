import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const migrationName = 'ResetAgentPlansForJobStatus1793353273511';

const oldPlanId = randomUUID();
const newPlanId = randomUUID();
const threadId = randomUUID();
const newThreadId = randomUUID();
const agentId = randomUUID();
const projectId = randomUUID();
const taskId = randomUUID();

const stop = {
	planId: oldPlanId,
	planRevision: 4,
	stoppedTaskIds: [taskId],
	restartTaskIds: [taskId],
	generation: { jobIds: ['saved-job'] },
	pause: { id: randomUUID(), reportedAt: '2026-10-01T10:00:00Z' },
	failures: [{ jobId: 'saved-job', error: 'Stop failed' }],
};

const state = {
	messages: [{ role: 'assistant', content: 'Saved conversation' }],
	persistence: {
		threadId,
		hostMetadata: {
			n8nPlanTask: { planId: oldPlanId, planTaskId: taskId },
			unrelated: { keep: true },
		},
	},
};

const preservedTables = [
	'agents_messages',
	'agent_execution',
	'agent_background_job',
	'agent_checkpoints',
];

let before: Record<string, unknown[]>;

const parseJson = (value: unknown): unknown =>
	typeof value === 'string' ? JSON.parse(value) : value;

async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>) {
	const context = createTestMigrationContext(Container.get(DataSource));

	try {
		return await fn(context);
	} finally {
		await context.queryRunner.release();
	}
}

async function insert(ctx: TestMigrationContext, table: string, values: Record<string, string>) {
	const columns = Object.keys(values);

	await ctx.runQuery(
		`INSERT INTO ${ctx.escape.tableName(table)} (${columns.map(ctx.escape.columnName).join(', ')}) VALUES (${columns.map((name) => `:${name}`).join(', ')})`,
		values,
	);
}

async function read(ctx: TestMigrationContext, table: string) {
	return await ctx.runQuery<Array<Record<string, unknown>>>(
		`SELECT * FROM ${ctx.escape.tableName(table)} ORDER BY ${ctx.escape.columnName(table === 'agent_checkpoints' ? 'runId' : table === 'agent_plan_history' ? 'planId' : 'id')}`,
	);
}

beforeAll(async () => {
	await Container.get(DbConnection).init();
	await withContext(async (ctx) => await ctx.queryRunner.clearDatabase());
	await initDbUpToMigration(migrationName);

	await withContext(async (ctx) => {
		await insert(ctx, 'project', { id: projectId, name: 'Plan test project', type: 'team' });
		await insert(ctx, 'agents', {
			id: agentId,
			projectId,
			name: 'Plan test agent',
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});

		for (const id of [threadId, newThreadId])
			await insert(ctx, 'agent_execution_threads', {
				id,
				projectId,
				agentId,
				agentName: 'Plan test agent',
				taskStop: JSON.stringify(
					id === threadId ? stop : { planId: newPlanId, pause: { id: 'keep' } },
				),
			});

		for (const [id, thread, formatVersion] of [
			[oldPlanId, threadId, '1'],
			[newPlanId, newThreadId, '2'],
		]) {
			await insert(ctx, 'agent_plan', { id, threadId: thread, formatVersion, data: '{}' });
			await insert(ctx, 'agent_plan_history', {
				planId: id,
				revision: '1',
				formatVersion,
				data: '{}',
			});
		}

		await insert(ctx, 'agents_threads', { id: threadId, resourceId: 'test' });
		await insert(ctx, 'agents_messages', {
			id: randomUUID(),
			threadId,
			resourceId: 'test',
			role: 'assistant',
			content: JSON.stringify({
				role: 'assistant',
				content: [{ type: 'text', text: 'Saved message' }],
			}),
		});
		await insert(ctx, 'agent_execution', {
			id: randomUUID(),
			threadId,
			status: 'success',
			userMessage: 'Saved input',
		});

		for (const planId of [oldPlanId, newPlanId])
			await insert(ctx, 'agent_background_job', {
				id: randomUUID(),
				planId,
				planTaskId: taskId,
				parentAgentId: agentId,
				parentThreadId: threadId,
				parentResourceId: 'test',
				parentPrincipalHash: 'principal',
				title: 'Saved job',
				kind: 'workflow',
				status: 'completed',
				result: '{"answer":42}',
			});

		await insert(ctx, 'agent_checkpoints', {
			runId: 'linked',
			agentId,
			threadId,
			state: JSON.stringify(state),
		});
		await insert(ctx, 'agent_checkpoints', {
			runId: 'unrelated',
			agentId,
			threadId,
			state: JSON.stringify({ data: 'preserve' }),
		});
		await insert(ctx, 'agent_checkpoints', {
			runId: 'current',
			agentId,
			threadId,
			state: JSON.stringify({
				persistence: { hostMetadata: { n8nPlanTask: { planId: newPlanId, planTaskId: taskId } } },
			}),
		});

		before = Object.fromEntries(
			await Promise.all(preservedTables.map(async (table) => [table, await read(ctx, table)])),
		);
	});
});

afterAll(async () => await Container.get(DbConnection).close());

it('removes old plans and references and preserves conversation and job data', async () => {
	await runSingleMigration(migrationName);

	await withContext(async (ctx) => {
		expect(await read(ctx, 'agent_plan')).toEqual([
			expect.objectContaining({ id: newPlanId, formatVersion: 2 }),
		]);
		expect(await read(ctx, 'agent_plan_history')).toEqual([
			expect.objectContaining({ planId: newPlanId }),
		]);

		for (const table of ['agents_messages', 'agent_execution'])
			expect(await read(ctx, table)).toEqual(before[table]);

		expect(await read(ctx, 'agent_background_job')).toEqual(
			before.agent_background_job.map((row) => {
				const job = row as Record<string, unknown>;

				return job.planId === oldPlanId ? { ...job, planId: null, planTaskId: null } : job;
			}),
		);

		const threads = await read(ctx, 'agent_execution_threads');
		const oldThread = threads.find((row) => row.id === threadId)!;

		expect(parseJson(oldThread.taskStop as string)).toEqual({
			planId: null,
			generation: stop.generation,
			pause: stop.pause,
			failures: stop.failures,
		});
		expect(parseJson(threads.find((row) => row.id === newThreadId)!.taskStop as string)).toEqual({
			planId: newPlanId,
			pause: { id: 'keep' },
		});

		const checkpoints = await read(ctx, 'agent_checkpoints');
		const linked = checkpoints.find((row) => row.runId === 'linked')!;

		expect(parseJson(linked.state as string)).toEqual({
			...state,
			persistence: { ...state.persistence, hostMetadata: { unrelated: { keep: true } } },
		});

		for (const row of checkpoints.filter((row) => row.runId !== 'linked'))
			expect(before.agent_checkpoints).toContainEqual(row);
	});
});
