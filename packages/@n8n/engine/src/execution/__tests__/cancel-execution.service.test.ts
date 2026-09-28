import { describe, expect, it, vi } from 'vitest';

import type { LifecycleEventPublisher } from '../../lifecycle-events';
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
};

function makeExecutionStore(overrides: Partial<ExecutionStore> = {}): ExecutionStore {
	return {
		createExecution: vi.fn(),
		loadExecution: vi.fn().mockResolvedValue({ ...execution, status: 'cancelled' }),
		transitionStatus: vi.fn(),
		finishExecution: vi.fn(),
		cancelExecution: vi.fn().mockResolvedValue(true),
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
	const service = new CancelExecutionService(executionStore, stepStore, publisher);
	return { service, stepStore, publisher };
}

describe('CancelExecutionService', () => {
	it('ends the execution, sweeps its pending steps, and announces the end once', async () => {
		const executionStore = makeExecutionStore();
		const { service, stepStore, publisher } = makeService(executionStore);

		const result = await service.cancel('exec-1');

		expect(result).toEqual({ status: 'cancelled' });
		expect(executionStore.cancelExecution).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(stepStore.cancelPendingSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(publisher.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'execution:cancelled',
			executionId: 'exec-1',
			workflowId: 'wf-1',
			at: expect.any(String),
		});
	});

	it.each<ExecutionStatus>(['completed', 'failed'])(
		'reports the status of an execution that already %s and announces nothing',
		async (status) => {
			const executionStore = makeExecutionStore({
				cancelExecution: vi.fn().mockResolvedValue(false),
				loadExecution: vi.fn().mockResolvedValue({ ...execution, status }),
			});
			const { service, stepStore, publisher } = makeService(executionStore);

			const result = await service.cancel('exec-1');

			expect(result).toEqual({ status });
			expect(stepStore.cancelPendingSteps).not.toHaveBeenCalled();
			expect(publisher.publish).not.toHaveBeenCalled();
		},
	);

	it('sweeps again on a repeated cancel, announcing nothing more', async () => {
		const executionStore = makeExecutionStore({
			cancelExecution: vi.fn().mockResolvedValue(false),
			loadExecution: vi.fn().mockResolvedValue({ ...execution, status: 'cancelled' }),
		});
		const { service, stepStore, publisher } = makeService(executionStore);

		const result = await service.cancel('exec-1');

		expect(result).toEqual({ status: 'cancelled' });
		expect(stepStore.cancelPendingSteps).toHaveBeenCalledExactlyOnceWith('exec-1');
		expect(publisher.publish).not.toHaveBeenCalled();
	});

	it('throws for an unknown execution', async () => {
		const executionStore = makeExecutionStore({
			cancelExecution: vi.fn().mockResolvedValue(false),
			loadExecution: vi.fn().mockRejectedValue(new ExecutionNotFoundError('exec-404')),
		});
		const { service, stepStore } = makeService(executionStore);

		await expect(service.cancel('exec-404')).rejects.toThrow(ExecutionNotFoundError);
		expect(stepStore.cancelPendingSteps).not.toHaveBeenCalled();
	});
});
