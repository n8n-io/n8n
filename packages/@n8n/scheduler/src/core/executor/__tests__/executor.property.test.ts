import fc from 'fast-check';
import { mock } from 'vitest-mock-extended';

import type { ClaimedTask } from '../../types';
import { Executor } from '../executor';
import type { PrecisionTimer } from '../precision-timer';
import type { ExecutorTaskStore } from '../store';
import type { TaskHandler, TaskHandlerRegistry } from '../task-handler';

const HOST = 'main-property';
const TASK_TYPE = 'property-test-task';

const claimedTask = (id: string): ClaimedTask => ({
	id,
	jobId: 1,
	taskType: TASK_TYPE,
	payload: {},
	scheduledFor: new Date('2026-01-01T00:00:00.000Z'),
	runAt: new Date('2026-01-01T00:00:00.000Z'),
	status: 'running',
	attempts: 0,
	maxAttempts: 1,
	leaseEpoch: 1,
});

/**
 * The claim/dispatch exactly-once invariant, fuzzed over randomised batches:
 * every claimed task dispatches to its handler at most once, and a task whose
 * `markStarted` guard finds nothing to start (already reclaimed or deleted) is
 * never dispatched. Store, registry and timer are all mocked, and each fire
 * callback is invoked by hand, so the detached-fire path stays deterministic.
 */
describe('Executor claim/dispatch (fast-check)', () => {
	it('dispatches each claimed task at most once, and never dispatches one whose markStarted found nothing to start', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.uniqueArray(
					fc.record({ id: fc.string({ minLength: 1, maxLength: 8 }), started: fc.boolean() }),
					{ minLength: 1, maxLength: 20, selector: (entry) => entry.id },
				),
				async (entries) => {
					const store = mock<ExecutorTaskStore>();
					const registry = mock<TaskHandlerRegistry>();
					const timer = mock<PrecisionTimer>();
					const tasks = entries.map((entry) => claimedTask(entry.id));
					const executeCalls: string[] = [];
					const handlerExecute = vi.fn().mockResolvedValue(undefined);
					const handler: TaskHandler = { execute: handlerExecute };

					registry.registeredTypes.mockReturnValue([TASK_TYPE]);
					registry.resolve.mockReturnValue(handler);
					store.claimDueTasks.mockResolvedValue(tasks);
					// One resolved value per task, in claim order. `claimAndSchedule` schedules
					// them in that order, and each callback below calls `markStarted`
					// synchronously before its first await, so the queued values line up.
					for (const entry of entries) {
						store.markStarted.mockResolvedValueOnce(entry.started ? 1 : 0);
					}
					store.completeTask.mockResolvedValue(1);

					const executor = new Executor(store, registry, timer, {
						leaseSeconds: 60,
						lookaheadSeconds: 5,
						batchSize: 100,
					});

					await executor.claimAndSchedule(HOST);
					const fireCallbacks = timer.schedule.mock.calls.map(([, fireCallback]) => fireCallback);
					for (const fireCallback of fireCallbacks) fireCallback();
					// Let every detached `fire()` settle, including its awaited store calls.
					await new Promise((resolve) => setImmediate(resolve));
					await new Promise((resolve) => setImmediate(resolve));

					for (const call of handlerExecute.mock.calls) {
						executeCalls.push((call[0] as ClaimedTask).id);
					}

					for (const entry of entries) {
						const dispatchCount = executeCalls.filter((id) => id === entry.id).length;
						// Exactly once: the setup is deterministic (handler registered, store
						// mocked), so a started task must dispatch, not just "at most once".
						expect(dispatchCount).toBe(entry.started ? 1 : 0);
					}
				},
			),
		);
	});
});
