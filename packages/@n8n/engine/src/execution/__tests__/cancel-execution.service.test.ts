import { describe, expect, it, vi } from 'vitest';

import type { LifecycleEventPublisher } from '../../lifecycle-events';
import type { StepMessage, WorkQueue } from '../../queue';
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
	graph: { nodes: [], edges: [], seeded: [] },
	workflow: {},
	triggerOutputs: null,
	callerContext: { hostMode: 'trigger' },
	responseExpectation: { kind: 'none' },
	parent: null,
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
		loadSeededOutputs: vi.fn().mockResolvedValue(new Map()),
		refreshLiveStatus: vi.fn(),
		loadLiveChildIds: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

/** Only the sweep and the parent resume are reachable from a cancel. */
function makeStepStore(): StepStore {
	return {
		cancelPendingSteps: vi.fn(),
		resumeStep: vi.fn().mockResolvedValue(true),
	} as unknown as StepStore;
}

function makeService(executionStore: ExecutionStore) {
	const stepStore = makeStepStore();
	const publisher: LifecycleEventPublisher = { publish: vi.fn(), stop: vi.fn() };
	const responseSender: ExecutionResponseSender = {
		send: vi.fn(),
		stop: vi.fn(),
	};
	const stepQueue: WorkQueue<StepMessage> = { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
	const service = new CancelExecutionService(
		executionStore,
		stepStore,
		publisher,
		responseSender,
		stepQueue,
	);
	return { service, stepStore, publisher, responseSender, stepQueue };
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

	it('cancels every live child of the execution, and their children, after it', async () => {
		const children: Record<string, string[]> = {
			'exec-1': ['child-1', 'child-2'],
			'child-1': ['grandchild'],
		};
		const executionStore = makeExecutionStore({
			loadExecution: vi.fn().mockImplementation(async (id: string) => {
				return await Promise.resolve({
					...execution,
					id,
					status: 'cancelled',
					finishedAt: new Date(),
				});
			}),
			loadLiveChildIds: vi.fn().mockImplementation(async (id: string) => {
				return await Promise.resolve(children[id] ?? []);
			}),
		});
		const { service, stepStore } = makeService(executionStore);

		await service.cancel('exec-1');

		expect(vi.mocked(executionStore.cancelExecution).mock.calls.map(([id]) => id)).toEqual([
			'exec-1',
			'child-1',
			'grandchild',
			'child-2',
		]);
		expect(vi.mocked(stepStore.cancelPendingSteps).mock.calls.map(([id]) => id)).toEqual([
			'exec-1',
			'child-1',
			'grandchild',
			'child-2',
		]);
	});

	it('cancels no child when the execution had already ended', async () => {
		const executionStore = makeExecutionStore({
			cancelExecution: vi.fn().mockResolvedValue(null),
			loadExecution: vi.fn().mockResolvedValue({ ...execution, status: 'completed' }),
		});
		const { service } = makeService(executionStore);

		await service.cancel('exec-1');

		expect(executionStore.loadLiveChildIds).not.toHaveBeenCalled();
	});

	it('resumes the awaiting parent step with a cancelled cause when a child is cancelled on its own', async () => {
		const parent = { executionId: 'exec-parent', stepId: 'step-call', awaited: true };
		const executionStore = makeExecutionStore({
			loadExecution: vi
				.fn()
				.mockResolvedValue({ ...execution, parent, status: 'cancelled', finishedAt: new Date() }),
		});
		const { service, stepStore, stepQueue } = makeService(executionStore);

		await service.cancel('exec-1');

		expect(stepStore.resumeStep).toHaveBeenCalledExactlyOnceWith('step-call', {
			kind: 'child',
			executionId: 'exec-1',
			status: 'cancelled',
			error: { name: 'ExecutionCancelledError', message: 'Execution exec-1 was cancelled' },
		});
		expect(stepQueue.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'step:ready',
			executionId: 'exec-parent',
			stepId: 'step-call',
		});
		expect(executionStore.refreshLiveStatus).toHaveBeenCalledWith('exec-parent');
	});

	it('resumes no parent for a child it does not wait for', async () => {
		const parent = { executionId: 'exec-parent', stepId: 'step-fire', awaited: false };
		const executionStore = makeExecutionStore({
			loadExecution: vi
				.fn()
				.mockResolvedValue({ ...execution, parent, status: 'cancelled', finishedAt: new Date() }),
		});
		const { service, stepStore, stepQueue } = makeService(executionStore);

		await service.cancel('exec-1');

		expect(stepStore.resumeStep).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
	});

	it('announces no resume when the parent step no longer waits', async () => {
		// The parent was cancelled first, and its cascade is what cancels this child.
		const parent = { executionId: 'exec-parent', stepId: 'step-call', awaited: true };
		const executionStore = makeExecutionStore({
			loadExecution: vi
				.fn()
				.mockResolvedValue({ ...execution, parent, status: 'cancelled', finishedAt: new Date() }),
		});
		const { service, stepStore, stepQueue } = makeService(executionStore);
		vi.mocked(stepStore.resumeStep).mockResolvedValue(false);

		await service.cancel('exec-1');

		expect(stepQueue.publish).not.toHaveBeenCalled();
	});

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
