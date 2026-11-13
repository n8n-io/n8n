import { describe, expect, it, vi } from 'vitest';

import type { ExecutionStore } from '../../execution';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import { QueuedExecutionDetector } from '../queued-execution-detector';
import { QueuedExecutionRepair } from '../queued-execution-repair';

const at = new Date('2026-01-01T00:10:00.000Z');
const staleAfter = new Date('2026-01-01T00:00:00.000Z');

/** Only the two methods of the stuck `queued` execution are exercised here. */
function makeExecutionStore(): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn(),
		loadExecutionStatus: vi.fn(),
		loadSeededOutputs: vi.fn(),
		transitionStatus: vi.fn(),
		finishExecution: vi.fn(),
		cancelExecution: vi.fn(),
		findStaleQueuedExecutions: vi.fn().mockResolvedValue([]),
		renewQueuedExecution: vi.fn().mockResolvedValue(true),
		refreshLiveStatus: vi.fn(),
	};
}

function makeOrchestrationQueue(): WorkQueue<OrchestrationMessage> {
	return { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

describe('QueuedExecutionDetector', () => {
	it('returns one finding for each stale queued execution, within its batch size', async () => {
		const executionStore = makeExecutionStore();
		vi.mocked(executionStore.findStaleQueuedExecutions).mockResolvedValue([
			{ id: 'exec-1', staleAfter },
			{ id: 'exec-2', staleAfter },
		]);
		const detector = new QueuedExecutionDetector(executionStore, 1_000, 25);

		const findings = await detector.detect(at);

		expect(executionStore.findStaleQueuedExecutions).toHaveBeenCalledExactlyOnceWith(at, 25);
		expect(findings).toEqual([
			{ kind: 'execution-queued-no-message', executionId: 'exec-1', staleAfter },
			{ kind: 'execution-queued-no-message', executionId: 'exec-2', staleAfter },
		]);
	});
});

describe('QueuedExecutionRepair', () => {
	const finding = {
		kind: 'execution-queued-no-message',
		executionId: 'exec-1',
		staleAfter,
	} as const;

	it('renews the execution with the observed time, then publishes the event again', async () => {
		const executionStore = makeExecutionStore();
		const orchestrationQueue = makeOrchestrationQueue();
		const repair = new QueuedExecutionRepair(executionStore, orchestrationQueue);

		expect(await repair.apply(finding)).toBe(true);

		expect(executionStore.renewQueuedExecution).toHaveBeenCalledExactlyOnceWith(
			'exec-1',
			staleAfter,
		);
		expect(orchestrationQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'execution:enqueued',
			executionId: 'exec-1',
		});
		expect(vi.mocked(executionStore.renewQueuedExecution).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(orchestrationQueue.publish).mock.invocationCallOrder[0],
		);
	});

	it('publishes nothing when the renewal changed no row', async () => {
		const executionStore = makeExecutionStore();
		vi.mocked(executionStore.renewQueuedExecution).mockResolvedValue(false);
		const orchestrationQueue = makeOrchestrationQueue();
		const repair = new QueuedExecutionRepair(executionStore, orchestrationQueue);

		expect(await repair.apply(finding)).toBe(false);

		expect(orchestrationQueue.publish).not.toHaveBeenCalled();
	});
});
