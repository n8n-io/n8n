import { describe, expect, it, vi } from 'vitest';

import type { ExecutionRecord, ExecutionStore, StepRecord, StepStore } from '../../execution';
import { LifecycleEventPublisherFactory } from '../../lifecycle-events';
import type { LifecycleEventPublisher } from '../../lifecycle-events';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
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
	waitDeclaration: null,
	resumeCause: null,
};

const execution = {
	id: 'exec-1',
	workflowId: 'wf-1',
	status: 'running',
	graph: { nodes: [{ id: 'node-a', name: 'Send mail', type: 'v1-node' }], edges: [], seeded: [] },
	lifecycleEventSubscription: { kind: 'all' },
} as unknown as ExecutionRecord;

/** Only the methods of the stuck `running` step are exercised here. */
function makeStepStore() {
	return {
		findStaleRunningSteps: vi.fn<StepStore['findStaleRunningSteps']>().mockResolvedValue([]),
		failStaleRunningStep: vi.fn<StepStore['failStaleRunningStep']>().mockResolvedValue(true),
		loadStep: vi.fn<StepStore['loadStep']>().mockResolvedValue(step),
	};
}

function makeRepair(stepStore = makeStepStore()) {
	const executionStore = {
		loadExecution: vi.fn<ExecutionStore['loadExecution']>().mockResolvedValue(execution),
	};
	const orchestrationQueue: WorkQueue<OrchestrationMessage> = {
		publish: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
	};
	const publisher: LifecycleEventPublisher = { publish: vi.fn(), stop: vi.fn() };
	const repair = new RunningStepRepair(
		executionStore as unknown as ExecutionStore,
		stepStore as unknown as StepStore,
		orchestrationQueue,
		new LifecycleEventPublisherFactory(publisher),
	);
	return { repair, stepStore, executionStore, orchestrationQueue, publisher };
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
		const { repair, stepStore, executionStore } = makeRepair();

		expect(await repair.apply(finding)).toBe(true);

		expect(executionStore.loadExecution).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.failStaleRunningStep).toHaveBeenCalledExactlyOnceWith('step-1', staleAfter, {
			name: 'StaleRunningStepError',
			message: expect.stringContaining('"Send mail"') as string,
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
