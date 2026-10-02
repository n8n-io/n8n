import { describe, expect, it, vi } from 'vitest';

import type { LifecycleEventPublisher } from '../../lifecycle-events';
import type { ExecutionResponseSender } from '../../response-channel';
import { CancelExecutionService } from '../cancel-execution.service';
import {
	ExecutionNotFoundError,
	type ExecutionRecord,
	type ExecutionStore,
} from '../execution-store';
import type { ExecutionStatus } from '../execution.types';
import type { StepStore } from '../step-store';

const execution: ExecutionRecord = {
	id: 'exec-1',
	workflowId: 'wf-1',
	status: 'running',
	mode: 'production',
	graph: { nodes: [], edges: [] },
	workflow: {},
	triggerOutputs: null,
	callerContext: { hostMode: 'trigger' },
	responseExpectation: { kind: 'none' },
	finishedAt: null,
};

function makeExecutionStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi
			.fn()
			.mockResolvedValue({ ...execution, status: 'cancelled', finishedAt: new Date() }),
		transitionStatus: vi.fn(),
		finishExecution: vi.fn(),
		cancelExecution: vi
			.fn()
			.mockResolvedValue({ finishedAt: new Date('2026-09-30T08:00:00.000Z') }),
		refreshLiveStatus: vi.fn(),
		...overrides,
	};
}

/** Only the sweep is exercised here; everything else is unreachable from a cancel. */
function makeStepStore(): StepStore {
	return { cancelPendingSteps: vi.fn() } as unknown as StepStore;
}

function makeService(executionStore: ExecutionStore) {
	const stepStore = makeStepStore();
	const publisher: LifecycleEventPublisher = { publish: vi.fn(), stop: vi.fn() };
	const responseSender: ExecutionResponseSender = {
		send: vi.fn(),
		stop: vi.fn(),
	};
	const service = new CancelExecutionService(executionStore, stepStore, publisher, responseSender);
	return { service, stepStore, publisher, responseSender };
}

describe('CancelExecutionService', () => {
	it('ends the execution, sweeps its pending steps, and announces the end once', async () => {
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockResolvedValue({
				...execution,
				status: 'cancelled',
				finishedAt: new Date('2026-09-30T08:00:00.000Z'),
				responseExpectation: { kind: 'runEnd' },
			}),
		});
		const { service, stepStore, publisher, responseSender } = makeService(executionStore);

		const result = await service.cancel('exec-1');

		expect(result).toEqual({
			status: 'cancelled',
			finishedAt: new Date('2026-09-30T08:00:00.000Z'),
		});
		expect(executionStore.cancelExecution).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.cancelPendingSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(publisher.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'execution:cancelled',
			executionId: 'exec-1',
			workflowId: 'wf-1',
			at: '2026-09-30T08:00:00.000Z',
		});
		expect(responseSender.send).toHaveBeenCalledExactlyOnceWith({
			type: 'ended',
			executionId: 'exec-1',
			workflowId: 'wf-1',
			status: 'cancelled',
			lastStep: null,
		});
	});

	it('sends no ended message when the caller expects none', async () => {
		const executionStore = makeExecutionStore();
		const { service, publisher, responseSender } = makeService(executionStore);

		await service.cancel('exec-1');

		// The run still ends: only the response is left out.
		expect(publisher.publish).toHaveBeenCalledTimes(1);
		expect(responseSender.send).not.toHaveBeenCalled();
	});

	it.each<ExecutionStatus>(['completed', 'failed', 'cancelled'])(
		'reports the status of an execution that already ended %s and announces nothing',
		async (status) => {
			const executionStore = makeExecutionStore({
				cancelExecution: vi.fn().mockResolvedValue(null),
				loadExecution: vi.fn().mockResolvedValue({ ...execution, status }),
			});
			const { service, stepStore, publisher, responseSender } = makeService(executionStore);

			const result = await service.cancel('exec-1');

			expect(result).toMatchObject({ status });
			expect(stepStore.cancelPendingSteps).not.toHaveBeenCalled();
			expect(publisher.publish).not.toHaveBeenCalled();
			expect(responseSender.send).not.toHaveBeenCalled();
		},
	);

	it('throws for an unknown execution', async () => {
		const executionStore = makeExecutionStore({
			cancelExecution: vi.fn().mockResolvedValue(null),
			loadExecution: vi.fn().mockRejectedValue(new ExecutionNotFoundError('exec-404')),
		});
		const { service, stepStore } = makeService(executionStore);

		await expect(service.cancel('exec-404')).rejects.toThrow(ExecutionNotFoundError);
		expect(stepStore.cancelPendingSteps).not.toHaveBeenCalled();
	});
});
