import type { Logger } from '@n8n/backend-common';
import type { SchedulerConfig } from '@n8n/config';
import type { ScheduledTask as ScheduledTaskEntity, ScheduledTaskRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ClaimedTask } from '../../core/types';
import { backoff } from '../backoff';
import { Executor } from '../executor';
import type { PrecisionTimer } from '../precision-timer';
import type { TaskHandler, TaskHandlerRegistry } from '../task-handler';

const HOST = 'main-abc';

const claimedTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
	id: '1',
	jobId: '10',
	taskType: 'workflow:schedule-trigger',
	payload: {},
	scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
	runAt: new Date('2026-07-01T00:00:00.000Z'),
	status: 'running',
	attempts: 0,
	maxAttempts: 1,
	claimedBy: HOST,
	leaseExpiresAt: new Date('2026-07-01T00:01:00.000Z'),
	leaseEpoch: 1,
	startedAt: null,
	...overrides,
});

const setup = () => {
	const taskRepository = mock<ScheduledTaskRepository>();
	const registry = mock<TaskHandlerRegistry>();
	const timer = mock<PrecisionTimer>();
	const logger = mock<Logger>();
	const config = mock<SchedulerConfig>({ leaseDuration: 60, executorInterval: 5 });
	const executor = new Executor(taskRepository, registry, timer, logger, config);
	return { taskRepository, registry, timer, logger, executor };
};

describe('Executor.claimAndSchedule', () => {
	it('claims nothing when no handlers are registered', async () => {
		const { taskRepository, registry, executor } = setup();
		registry.registeredTypes.mockReturnValue([]);

		const claimed = await executor.claimAndSchedule(HOST);

		expect(claimed).toEqual([]);
		expect(taskRepository.claimDueTasks).not.toHaveBeenCalled();
	});

	it('claims with the registered types, lease and lookahead, and schedules each task', async () => {
		const { taskRepository, registry, timer, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		taskRepository.claimDueTasks.mockResolvedValue([task] as unknown as ScheduledTaskEntity[]);

		const claimed = await executor.claimAndSchedule(HOST);

		expect(taskRepository.claimDueTasks).toHaveBeenCalledWith({
			host: HOST,
			taskTypes: ['workflow:schedule-trigger'],
			leaseMs: 60_000,
			lookaheadMs: 5_000,
			batchSize: 100,
		});
		expect(timer.schedule).toHaveBeenCalledWith(task.runAt, expect.any(Function));
		expect(claimed).toEqual([task]);
	});

	it('maps each claimed row independently: an unmappable row is released and the rest schedule', async () => {
		const { taskRepository, registry, timer, logger, executor } = setup();
		const good = claimedTask({ id: 'good' });
		// A row the real entityToClaimedTask rejects (claimedBy on a claimed row is
		// non-null by contract), fed alongside a valid one.
		const bad = { ...claimedTask({ id: 'bad' }), claimedBy: null };
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		taskRepository.claimDueTasks.mockResolvedValue([bad, good] as unknown as ScheduledTaskEntity[]);

		const claimed = await executor.claimAndSchedule(HOST);

		expect(claimed).toEqual([good]);
		expect(timer.schedule).toHaveBeenCalledTimes(1);
		expect(timer.schedule).toHaveBeenCalledWith(good.runAt, expect.any(Function));
		expect(logger.error).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ taskId: 'bad' }),
		);
		expect(taskRepository.releaseClaim).toHaveBeenCalledWith(HOST, 'bad');
	});

	it('scheduled callback dispatches the task, and a mid-fire rejection is logged not thrown', async () => {
		const { taskRepository, registry, timer, logger, executor } = setup();
		const task = claimedTask();
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		taskRepository.claimDueTasks.mockResolvedValue([task] as unknown as ScheduledTaskEntity[]);
		// Make fire reject at its first taskRepository call to exercise the detached-error path.
		taskRepository.markStarted.mockRejectedValue(new Error('db down'));

		await executor.claimAndSchedule(HOST);
		const scheduledCallback = timer.schedule.mock.calls[0][1];

		// The callback detaches fire(); invoking it must not throw despite the rejection.
		expect(() => scheduledCallback()).not.toThrow();
		await new Promise((resolve) => setImmediate(resolve)); // let the detached catch run
		expect(logger.error).toHaveBeenCalledWith(
			'Scheduler executor failed to fire task',
			expect.objectContaining({ taskId: task.id, taskType: task.taskType }),
		);
	});
});

describe('Executor.fire', () => {
	it('does not dispatch when the row is gone or reclaimed (markStarted affects 0 rows)', async () => {
		const { taskRepository, registry, executor } = setup();
		taskRepository.markStarted.mockResolvedValue(0);

		await executor.fire(HOST, claimedTask());

		expect(registry.resolve).not.toHaveBeenCalled();
		expect(taskRepository.completeTask).not.toHaveBeenCalled();
		expect(taskRepository.failTaskTerminal).not.toHaveBeenCalled();
	});

	it('dispatches and completes on handler success', async () => {
		const { taskRepository, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask();

		await executor.fire(HOST, task);

		expect(handler.execute).toHaveBeenCalledWith(task);
		expect(taskRepository.completeTask).toHaveBeenCalledWith(HOST, task.id);
		expect(taskRepository.failTaskTerminal).not.toHaveBeenCalled();
		expect(taskRepository.rescheduleTask).not.toHaveBeenCalled();
	});

	it('propagates when recording success fails, without treating it as a handler failure', async () => {
		const { taskRepository, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		taskRepository.completeTask.mockRejectedValue(new Error('db down'));
		const task = claimedTask({ attempts: 0, maxAttempts: 3 });

		await expect(executor.fire(HOST, task)).rejects.toThrow('db down');

		// A completeTask failure must not be recorded as a task failure/retry.
		expect(taskRepository.failTaskTerminal).not.toHaveBeenCalled();
		expect(taskRepository.rescheduleTask).not.toHaveBeenCalled();
	});

	it('re-queues with backoff(nextAttempt) when the handler fails and attempts remain', async () => {
		const { taskRepository, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ attempts: 0, maxAttempts: 3 });

		await executor.fire(HOST, task);

		// nextAttempt = 1 -> backoff(1) = 5000ms (asserted as a literal to decouple the oracle).
		expect(taskRepository.rescheduleTask).toHaveBeenCalledWith(HOST, task.id, 5_000, 'boom');
		expect(taskRepository.failTaskTerminal).not.toHaveBeenCalled();
		expect(taskRepository.completeTask).not.toHaveBeenCalled();
	});

	it('uses the next attempt number for backoff on a middle attempt', async () => {
		const { taskRepository, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ attempts: 1, maxAttempts: 3 });

		await executor.fire(HOST, task);

		// nextAttempt = 2 -> backoff(2) = 10000ms; proves it's backoff(attempts+1), not backoff(attempts).
		expect(taskRepository.rescheduleTask).toHaveBeenCalledWith(HOST, task.id, backoff(2), 'boom');
	});

	it('fails terminally when the handler fails on the single default attempt', async () => {
		const { taskRepository, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		const task = claimedTask({ attempts: 0, maxAttempts: 1 });

		await executor.fire(HOST, task);

		expect(taskRepository.failTaskTerminal).toHaveBeenCalledWith(HOST, task.id, 'boom');
		expect(taskRepository.rescheduleTask).not.toHaveBeenCalled();
		expect(taskRepository.completeTask).not.toHaveBeenCalled();
	});

	it('fails terminally on the final attempt of a multi-attempt task (>= boundary)', async () => {
		const { taskRepository, registry, executor } = setup();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(handler);
		// nextAttempt = 3 == maxAttempts -> terminal, not another retry.
		const task = claimedTask({ attempts: 2, maxAttempts: 3 });

		await executor.fire(HOST, task);

		expect(taskRepository.failTaskTerminal).toHaveBeenCalledWith(HOST, task.id, 'boom');
		expect(taskRepository.rescheduleTask).not.toHaveBeenCalled();
	});

	it('releases the claim without burning an attempt when no handler resolves at fire time', async () => {
		const { taskRepository, registry, logger, executor } = setup();
		taskRepository.markStarted.mockResolvedValue(1);
		registry.resolve.mockReturnValue(undefined);
		const task = claimedTask({ taskType: 'gone' });

		await executor.fire(HOST, task);

		expect(taskRepository.releaseClaim).toHaveBeenCalledWith(HOST, task.id);
		expect(taskRepository.failTaskTerminal).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
	});
});

describe('Executor.stop', () => {
	it('cancels all pending timers', async () => {
		const { timer, executor } = setup();
		await executor.stop();
		expect(timer.cancelAll).toHaveBeenCalled();
	});

	it('releases the claim for each claimed-but-unfired task', async () => {
		const { taskRepository, registry, executor } = setup();
		const a = claimedTask({ id: 'a' });
		const b = claimedTask({ id: 'b' });
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		taskRepository.claimDueTasks.mockResolvedValue([a, b] as unknown as ScheduledTaskEntity[]);

		await executor.claimAndSchedule(HOST); // timer is mocked, callbacks do not auto-fire
		await executor.stop();

		expect(taskRepository.releaseClaim).toHaveBeenCalledWith(HOST, 'a');
		expect(taskRepository.releaseClaim).toHaveBeenCalledWith(HOST, 'b');
	});

	it('does not release a task whose timer callback has already begun firing', async () => {
		const { taskRepository, registry, timer, executor } = setup();
		const task = claimedTask({ id: 'a' });
		registry.registeredTypes.mockReturnValue(['workflow:schedule-trigger']);
		taskRepository.claimDueTasks.mockResolvedValue([task] as unknown as ScheduledTaskEntity[]);
		taskRepository.markStarted.mockResolvedValue(0); // fire is a benign no-op

		await executor.claimAndSchedule(HOST);
		// Simulate the timer firing the task before shutdown.
		const scheduledCallback = timer.schedule.mock.calls[0][1];
		scheduledCallback();
		await new Promise((resolve) => setImmediate(resolve)); // let the detached fire settle

		await executor.stop();

		expect(taskRepository.releaseClaim).not.toHaveBeenCalled();
	});
});
