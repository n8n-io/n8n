import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createStores, type EngineStores } from '../../create-stores';
import { generateId } from '../../generate-id';
import { startTestDatabase, type TestDatabase } from '../../__tests__/test-database';

/**
 * The SQLite adapter end to end, through the store interfaces: the same calls
 * the handlers make, in the order they make them.
 */
describe('SQLite stores (integration)', () => {
	let database: TestDatabase;
	let stores: EngineStores;

	beforeAll(async () => {
		process.env.ENGINE_TEST_DB = 'sqlite';
		database = await startTestDatabase();
		stores = createStores(database.dataSource);
	});

	afterAll(async () => {
		await database.stop();
	});

	async function createExecution(): Promise<string> {
		const id = generateId();
		await stores.executionStore.createExecution({
			id,
			workflowId: 'wf-1',
			status: 'running',
			mode: 'production',
			graph: { nodes: [], edges: [], seeded: [] },
			workflow: { name: 'Sample' },
			triggerOutputs: [[{ json: { hello: 'world' } }]],
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
		});
		return id;
	}

	it('runs a step through its lifecycle and reads it back with the execution', async () => {
		const executionId = await createExecution();
		const { stepStore, executionStore, executionViewStore } = stores;

		const created = await stepStore.createSteps(executionId, [
			{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [[{ json: { a: 1 } }]] },
			{ nodeId: 'a', iteration: 0, status: 'queued' },
		]);
		expect(created.map((step) => step.nodeId)).toEqual(['trigger', 'a']);

		const again = await stepStore.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'queued' },
		]);
		expect(again).toEqual([]);

		const [, a] = created;
		const claimed = await stepStore.claimStep(a.id);
		expect(claimed).toMatchObject({ id: a.id, nodeId: 'a', status: 'running' });
		expect(await stepStore.claimStep(a.id)).toBeNull();

		const summaries = await stepStore.loadStepSummariesByKeys(executionId, [
			{ nodeId: 'trigger', iteration: 0 },
			{ nodeId: 'a', iteration: 0 },
		]);
		expect(summaries['trigger@0'].filledOutputSlots).toEqual([true]);
		expect(summaries['a@0'].filledOutputSlots).toEqual([]);

		expect(await stepStore.completeStep(a.id, [null, [{ json: { b: 2 } }]])).toBe(true);
		expect(await stepStore.completeStep(a.id, [])).toBe(false);

		const latest = await stepStore.loadLatestStepSummaries(executionId, ['a', 'missing']);
		expect(latest.a.filledOutputSlots).toEqual([false, true]);
		expect(latest.missing).toBeUndefined();

		expect(await stepStore.countSettledSteps(executionId)).toBe(2);

		const record = await executionStore.loadExecution(executionId);
		expect(record.triggerOutputs).toEqual([[{ json: { hello: 'world' } }]]);
		expect(record.parent).toBeNull();
		expect(record.finishedAt).toBeNull();

		const view = await executionViewStore.loadExecutionWithStepsView(executionId);
		expect(view.workflow).toEqual({ name: 'Sample' });
		expect(view.createdAt).toBeInstanceOf(Date);
		const byNode = (a: { nodeId: string }, b: { nodeId: string }) =>
			a.nodeId.localeCompare(b.nodeId);
		expect(
			[...view.steps].sort(byNode).map((step) => [step.nodeId, step.status, step.outputs]),
		).toEqual([
			['a', 'completed', [null, [{ json: { b: 2 } }]]],
			['trigger', 'completed', [[{ json: { a: 1 } }]]],
		]);
		expect(view.steps[0].createdAt).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);

		const finished = await executionStore.finishExecution(executionId, 'completed');
		expect(finished?.finishedAt).toBeInstanceOf(Date);
		expect(await executionStore.finishExecution(executionId, 'completed')).toBeNull();
	});

	it('suspends, resumes by deadline, and refreshes the live status', async () => {
		const executionId = await createExecution();
		const { stepStore, executionStore } = stores;
		const [step] = await stepStore.createSteps(executionId, [
			{ nodeId: 'wait', iteration: 0, status: 'queued' },
		]);
		await stepStore.claimStep(step.id);

		const resumeAt = new Date(Date.now() - 1000).toISOString();
		expect(
			await stepStore.suspendStep(step.id, {
				resumeAt,
				outputsAtDeadline: [],
				resumeBinding: 'execution',
			}),
		).toBe(true);
		await executionStore.refreshLiveStatus(executionId);
		expect(await executionStore.loadExecutionStatus(executionId)).toBe('waiting');

		const deadline = await stepStore.nextWaitDeadline();
		expect(deadline?.toISOString()).toBe(resumeAt);

		const due = await stepStore.resumeDueSteps(new Date(), 10);
		expect(due).toEqual([{ id: step.id, executionId }]);
		expect(await stepStore.resumeDueSteps(new Date(), 10)).toEqual([]);

		await executionStore.refreshLiveStatus(executionId);
		expect(await executionStore.loadExecutionStatus(executionId)).toBe('running');

		const resumed = await stepStore.claimStep(step.id);
		expect(resumed?.resumeCause).toEqual({ kind: 'deadline' });
		expect(resumed?.waitDeclaration).toEqual({
			resumeAt,
			outputsAtDeadline: [],
			resumeBinding: 'execution',
		});
	});

	it('refuses to create or claim steps once a sibling failed', async () => {
		const executionId = await createExecution();
		const { stepStore } = stores;
		const [a, b] = await stepStore.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'queued' },
			{ nodeId: 'b', iteration: 0, status: 'queued' },
		]);
		await stepStore.claimStep(a.id);
		expect(await stepStore.failStep(a.id, { name: 'E', message: 'boom' })).toBe(true);

		expect(await stepStore.claimStep(b.id)).toBeNull();
		expect(
			await stepStore.createSteps(executionId, [{ nodeId: 'c', iteration: 0, status: 'queued' }]),
		).toEqual([]);
		expect(await stepStore.hasFailedSteps(executionId)).toBe(true);
		expect((await stepStore.loadFailedSteps(executionId)).map((step) => step.nodeId)).toEqual([
			'a',
		]);
	});

	it('renews stale rows by compare-and-set', async () => {
		const executionId = await createExecution();
		const { stepStore } = stores;
		const [step] = await stepStore.createSteps(executionId, [
			{ nodeId: 'a', iteration: 0, status: 'queued' },
		]);
		const stale = (
			await stepStore.findStaleQueuedSteps(new Date(Date.now() + 3_600_000), 100)
		).find((row) => row.id === step.id);
		expect(stale).toMatchObject({ id: step.id, executionId });
		if (!stale) return;
		// A renewal in the same millisecond as the creation writes the same value.
		await new Promise((resolve) => setTimeout(resolve, 5));
		expect(await stepStore.renewQueuedStep(step.id, stale.staleAfter)).toBe(true);
		expect(await stepStore.renewQueuedStep(step.id, stale.staleAfter)).toBe(false);
	});

	it('lists and pages executions', async () => {
		const workflowId = generateId();
		const ids: string[] = [];
		for (let i = 0; i < 3; i++) {
			const id = generateId();
			ids.push(id);
			await stores.executionStore.createExecution({
				id,
				workflowId,
				status: 'queued',
				mode: 'manual',
				graph: { nodes: [], edges: [], seeded: [] },
				workflow: {},
				triggerOutputs: null,
				callerContext: { hostMode: 'manual' },
				responseExpectation: { kind: 'none' },
				parent: i === 0 ? null : { executionId: ids[0], stepId: generateId(), awaited: true },
			});
		}
		const { executionViewStore } = stores;
		const page = await executionViewStore.listExecutionViews({
			workflowIds: [workflowId],
			limit: 2,
		});
		expect(page.map((item) => item.id)).toEqual([ids[2], ids[1]]);
		expect(page[0].parent).toEqual({
			executionId: ids[0],
			stepId: expect.any(String),
			awaited: true,
		});
		expect(page[0].hostMode).toBe('manual');

		const last = page[1];
		const next = await executionViewStore.listExecutionViews({
			workflowIds: [workflowId],
			limit: 2,
			before: { id: last.id, createdAt: last.createdAt.toISOString() },
		});
		expect(next.map((item) => item.id)).toEqual([ids[0]]);
		expect(
			await executionViewStore.countExecutionViews({ workflowIds: [workflowId], limit: 2 }),
		).toBe(3);
		const subs = await executionViewStore.listExecutionViews({
			workflowIds: 'all',
			hasParent: true,
			parentExecutionId: ids[0],
			status: ['queued'],
			limit: 10,
		});
		expect(subs.map((item) => item.id).sort()).toEqual([ids[1], ids[2]].sort());

		const latest = await executionViewStore.loadLatestExecutionWithStepsView({
			workflowIds: [workflowId],
			hasParent: false,
		});
		expect(latest?.id).toBe(ids[0]);
		expect(latest?.steps).toEqual([]);
	});
});
