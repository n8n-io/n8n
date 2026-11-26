import { describe, expect, it, vi } from 'vitest';

import type { StepStore } from '../../execution';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import { SettledStepDetector } from '../settled-step-detector';
import { SettledStepRepair } from '../settled-step-repair';

const at = new Date('2026-01-01T00:10:00.000Z');
const staleAfter = new Date('2026-01-01T00:00:00.000Z');

/** Only the two methods of the settled step with no message are exercised here. */
function makeStepStore() {
	return {
		findStaleSettledSteps: vi.fn<StepStore['findStaleSettledSteps']>().mockResolvedValue([]),
		renewSettledStep: vi.fn<StepStore['renewSettledStep']>().mockResolvedValue(true),
	};
}

function makeOrchestrationQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

describe('SettledStepDetector', () => {
	it('returns one finding for each stale settled step, within its batch size', async () => {
		const stepStore = makeStepStore();
		stepStore.findStaleSettledSteps.mockResolvedValue([
			{ id: 'step-1', executionId: 'exec-1', staleAfter },
			{ id: 'step-2', executionId: 'exec-2', staleAfter },
		]);
		const detector = new SettledStepDetector(stepStore as unknown as StepStore, 1_000, 25);

		const findings = await detector.detect(at);

		expect(stepStore.findStaleSettledSteps).toHaveBeenCalledExactlyOnceWith(at, 25);
		expect(findings).toEqual([
			{ kind: 'step-settled-no-message', stepId: 'step-1', executionId: 'exec-1', staleAfter },
			{ kind: 'step-settled-no-message', stepId: 'step-2', executionId: 'exec-2', staleAfter },
		]);
	});
});

describe('SettledStepRepair', () => {
	const finding = {
		kind: 'step-settled-no-message',
		stepId: 'step-1',
		executionId: 'exec-1',
		staleAfter,
	} as const;

	it('renews the step with the observed time, then publishes the message again', async () => {
		const stepStore = makeStepStore();
		const orchestrationQueue = makeOrchestrationQueue();
		const repair = new SettledStepRepair(stepStore as unknown as StepStore, orchestrationQueue);

		expect(await repair.apply(finding)).toBe(true);

		expect(stepStore.renewSettledStep).toHaveBeenCalledExactlyOnceWith('step-1', staleAfter);
		expect(orchestrationQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:settled',
			executionId: 'exec-1',
			stepId: 'step-1',
		});
		expect(stepStore.renewSettledStep.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(orchestrationQueue.publish).mock.invocationCallOrder[0],
		);
	});

	it('publishes nothing when the renewal changed no row', async () => {
		const stepStore = makeStepStore();
		stepStore.renewSettledStep.mockResolvedValue(false);
		const orchestrationQueue = makeOrchestrationQueue();
		const repair = new SettledStepRepair(stepStore as unknown as StepStore, orchestrationQueue);

		expect(await repair.apply(finding)).toBe(false);

		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
	});
});
