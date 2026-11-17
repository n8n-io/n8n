import { describe, expect, it, vi } from 'vitest';

import type { StepStore } from '../../execution';
import type { StepMessage, WorkQueue } from '../../queue';
import { QueuedStepDetector } from '../queued-step-detector';
import { QueuedStepRepair } from '../queued-step-repair';

const at = new Date('2026-01-01T00:10:00.000Z');
const staleAfter = new Date('2026-01-01T00:00:00.000Z');

/** Only the two methods of the stuck `queued` step are exercised here. */
function makeStepStore() {
	return {
		findStaleQueuedSteps: vi.fn<StepStore['findStaleQueuedSteps']>().mockResolvedValue([]),
		renewQueuedStep: vi.fn<StepStore['renewQueuedStep']>().mockResolvedValue(true),
	};
}

function makeStepQueue(): WorkQueue<StepMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

describe('QueuedStepDetector', () => {
	it('returns one finding for each stale queued step, within its batch size', async () => {
		const stepStore = makeStepStore();
		stepStore.findStaleQueuedSteps.mockResolvedValue([
			{ id: 'step-1', executionId: 'exec-1', staleAfter },
			{ id: 'step-2', executionId: 'exec-2', staleAfter },
		]);
		const detector = new QueuedStepDetector(stepStore as unknown as StepStore, 1_000, 25);

		const findings = await detector.detect(at);

		expect(stepStore.findStaleQueuedSteps).toHaveBeenCalledExactlyOnceWith(at, 25);
		expect(findings).toEqual([
			{ kind: 'step-queued-no-message', stepId: 'step-1', executionId: 'exec-1', staleAfter },
			{ kind: 'step-queued-no-message', stepId: 'step-2', executionId: 'exec-2', staleAfter },
		]);
	});
});

describe('QueuedStepRepair', () => {
	const finding = {
		kind: 'step-queued-no-message',
		stepId: 'step-1',
		executionId: 'exec-1',
		staleAfter,
	} as const;

	it('renews the step with the observed time, then publishes the event again', async () => {
		const stepStore = makeStepStore();
		const stepQueue = makeStepQueue();
		const repair = new QueuedStepRepair(stepStore as unknown as StepStore, stepQueue);

		expect(await repair.apply(finding)).toBe(true);

		expect(stepStore.renewQueuedStep).toHaveBeenCalledExactlyOnceWith('step-1', staleAfter);
		expect(stepQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-1',
		});
		expect(stepStore.renewQueuedStep.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(stepQueue.publish).mock.invocationCallOrder[0],
		);
	});

	it('publishes nothing when the renewal changed no row', async () => {
		const stepStore = makeStepStore();
		stepStore.renewQueuedStep.mockResolvedValue(false);
		const stepQueue = makeStepQueue();
		const repair = new QueuedStepRepair(stepStore as unknown as StepStore, stepQueue);

		expect(await repair.apply(finding)).toBe(false);

		expect(stepQueue.publish).not.toHaveBeenCalled();
	});
});
