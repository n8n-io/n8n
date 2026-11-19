import { describe, expect, it, vi } from 'vitest';

import type { ExecutionRecord, ExecutionStore, StepRecord, StepStore } from '../../execution';
import { LifecycleEventPublisherFactory } from '../../lifecycle-events';
import type { LifecycleEventPublisher } from '../../lifecycle-events';
import type { OrchestrationMessage, StepMessage, WorkQueue } from '../../queue';
import { RunningStepDetector } from '../running-step-detector';
import { RunningStepRepair } from '../running-step-repair';

const at = new Date('2026-01-01T00:10:00.000Z');
const staleAfter = new Date('2026-01-01T00:00:00.000Z');

const step: StepRecord = {
	id: 'step-1',
	executionId: 'exec-1',
	nodeId: 'node-a',
	iteration: 0,
	status: 'running',
	outputs: null,
	outputSources: null,
	waitDeclaration: null,
	resumeCause: null,
	attempt: 1,
};

/** An execution with one node. `idempotent` is the flag that the caller set on that node. */
function makeExecution({
	idempotent,
	status = 'running',
}: { idempotent?: boolean; status?: ExecutionRecord['status'] } = {}): ExecutionRecord {
	return {
		id: 'exec-1',
		workflowId: 'wf-1',
		status,
		graph: {
			nodes: [{ id: 'node-a', name: 'Send mail', type: 'v1-node', idempotent }],
			edges: [],
			seeded: [],
		},
		lifecycleEventSubscription: { kind: 'all' },
	} as unknown as ExecutionRecord;
}

/** Only the methods of the stuck `running` step are exercised here. */
function makeStepStore(record: StepRecord = step) {
	return {
		findStaleRunningSteps: vi.fn<StepStore['findStaleRunningSteps']>().mockResolvedValue([]),
		failStaleRunningStep: vi.fn<StepStore['failStaleRunningStep']>().mockResolvedValue(true),
		requeueStaleRunningStep: vi.fn<StepStore['requeueStaleRunningStep']>().mockResolvedValue(true),
		loadStep: vi.fn<StepStore['loadStep']>().mockResolvedValue(record),
	};
}

function makeRepair(stepStore = makeStepStore(), execution = makeExecution()) {
	const executionStore = {
		loadExecution: vi.fn<ExecutionStore['loadExecution']>().mockResolvedValue(execution),
	};
	const stepQueue: WorkQueue<StepMessage> = { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
	const orchestrationQueue: WorkQueue<OrchestrationMessage> = {
		publish: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
	};
	const publisher: LifecycleEventPublisher = { publish: vi.fn(), stop: vi.fn() };
	const repair = new RunningStepRepair(
		executionStore as unknown as ExecutionStore,
		stepStore as unknown as StepStore,
		stepQueue,
		orchestrationQueue,
		new LifecycleEventPublisherFactory(publisher),
	);
	return { repair, stepStore, executionStore, stepQueue, orchestrationQueue, publisher };
}

describe('RunningStepDetector', () => {
	it('returns one finding for each stale running step, within its batch size', async () => {
		const stepStore = makeStepStore();
		stepStore.findStaleRunningSteps.mockResolvedValue([
			{ id: 'step-1', staleAfter },
			{ id: 'step-2', staleAfter },
		]);
		const detector = new RunningStepDetector(stepStore as unknown as StepStore, 1_000, 25);

		const findings = await detector.detect(at);

		expect(stepStore.findStaleRunningSteps).toHaveBeenCalledExactlyOnceWith(at, 25);
		expect(findings).toEqual([
			{ kind: 'step-running-no-worker', stepId: 'step-1', staleAfter },
			{ kind: 'step-running-no-worker', stepId: 'step-2', staleAfter },
		]);
	});
});

describe('RunningStepRepair', () => {
	const finding = { kind: 'step-running-no-worker', stepId: 'step-1', staleAfter } as const;

	it('fails the step with the observed time and an error that names the node', async () => {
		const { repair, stepStore, executionStore, stepQueue } = makeRepair();

		expect(await repair.apply(finding)).toBe(true);

		expect(executionStore.loadExecution).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.failStaleRunningStep).toHaveBeenCalledExactlyOnceWith('step-1', staleAfter, {
			name: 'StaleRunningStepError',
			message:
				'The node "Send mail" did not finish in time. The engine did not run it again, because a second run can repeat its side effects.',
		});
		expect(stepStore.requeueStaleRunningStep).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
	});

	describe('a step of an idempotent node', () => {
		const idempotent = makeExecution({ idempotent: true });

		it('queues the step again with the observed time, then publishes the ready event', async () => {
			const { repair, stepStore, stepQueue, orchestrationQueue, publisher } = makeRepair(
				makeStepStore(),
				idempotent,
			);

			expect(await repair.apply(finding)).toBe(true);

			expect(stepStore.requeueStaleRunningStep).toHaveBeenCalledExactlyOnceWith(
				'step-1',
				staleAfter,
			);
			expect(stepQueue.publish).toHaveBeenCalledExactlyOnceWith({
				type: 'step:ready',
				executionId: 'exec-1',
				stepId: 'step-1',
			});
			expect(stepStore.requeueStaleRunningStep.mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(stepQueue.publish).mock.invocationCallOrder[0],
			);
			// The step did not settle, so the repair announces no outcome.
			expect(stepStore.failStaleRunningStep).not.toHaveBeenCalled();
			expect(orchestrationQueue.publish).not.toHaveBeenCalled();
			expect(publisher.publish).not.toHaveBeenCalled();
		});

		it('publishes nothing when the requeue changed no row', async () => {
			const stepStore = makeStepStore();
			stepStore.requeueStaleRunningStep.mockResolvedValue(false);
			const { repair, stepQueue } = makeRepair(stepStore, idempotent);

			expect(await repair.apply(finding)).toBe(false);

			expect(stepQueue.publish).not.toHaveBeenCalled();
			expect(stepStore.failStaleRunningStep).not.toHaveBeenCalled();
		});

		it('queues the step again while it has an attempt left', async () => {
			const { repair, stepStore } = makeRepair(makeStepStore({ ...step, attempt: 2 }), idempotent);

			expect(await repair.apply(finding)).toBe(true);

			expect(stepStore.requeueStaleRunningStep).toHaveBeenCalledTimes(1);
		});

		it('fails the step when it has no attempt left', async () => {
			const { repair, stepStore, stepQueue, orchestrationQueue } = makeRepair(
				makeStepStore({ ...step, attempt: 3 }),
				idempotent,
			);

			expect(await repair.apply(finding)).toBe(true);

			expect(stepStore.requeueStaleRunningStep).not.toHaveBeenCalled();
			expect(stepQueue.publish).not.toHaveBeenCalled();
			expect(stepStore.failStaleRunningStep).toHaveBeenCalledExactlyOnceWith('step-1', staleAfter, {
				name: 'StaleRunningStepError',
				message: 'The node "Send mail" did not finish in time. The engine stopped after attempt 3.',
			});
			expect(orchestrationQueue.publish).toHaveBeenCalledExactlyOnceWith({
				type: 'step:settled',
				executionId: 'exec-1',
				stepId: 'step-1',
			});
		});

		it.each(['completed', 'failed', 'cancelled'] as const)(
			'fails the step when its execution is %s',
			async (status) => {
				const { repair, stepStore, stepQueue } = makeRepair(
					makeStepStore(),
					makeExecution({ idempotent: true, status }),
				);

				expect(await repair.apply(finding)).toBe(true);

				expect(stepStore.requeueStaleRunningStep).not.toHaveBeenCalled();
				expect(stepQueue.publish).not.toHaveBeenCalled();
				expect(stepStore.failStaleRunningStep).toHaveBeenCalledExactlyOnceWith(
					'step-1',
					staleAfter,
					{
						name: 'StaleRunningStepError',
						message:
							'The node "Send mail" did not finish in time. The engine did not run it again, because its execution already ended.',
					},
				);
			},
		);

		it('queues the step again when its execution is waiting', async () => {
			const { repair, stepStore } = makeRepair(
				makeStepStore(),
				makeExecution({ idempotent: true, status: 'waiting' }),
			);

			expect(await repair.apply(finding)).toBe(true);

			expect(stepStore.requeueStaleRunningStep).toHaveBeenCalledTimes(1);
		});
	});

	it('announces the failure after the write: the lifecycle event, then the settled event', async () => {
		const { repair, stepStore, orchestrationQueue, publisher } = makeRepair();

		await repair.apply(finding);

		expect(publisher.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:failed',
			executionId: 'exec-1',
			stepId: 'step-1',
			nodeId: 'node-a',
			nodeName: 'Send mail',
			iteration: 0,
			at: expect.any(String) as string,
			error: stepStore.failStaleRunningStep.mock.calls[0][2],
		});
		expect(orchestrationQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-1',
		});
		const written = stepStore.failStaleRunningStep.mock.invocationCallOrder[0];
		const announced = vi.mocked(publisher.publish).mock.invocationCallOrder[0];
		const settled = vi.mocked(orchestrationQueue.publish).mock.invocationCallOrder[0];
		expect(written).toBeLessThan(announced);
		expect(announced).toBeLessThan(settled);
	});

	it('announces nothing when the write changed no row', async () => {
		const stepStore = makeStepStore();
		stepStore.failStaleRunningStep.mockResolvedValue(false);
		const { repair, orchestrationQueue, publisher } = makeRepair(stepStore);

		expect(await repair.apply(finding)).toBe(false);

		expect(publisher.publish).not.toHaveBeenCalled();
		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
	});
});
