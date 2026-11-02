import { mock } from 'vitest-mock-extended';

import {
	HolderShutdownError,
	HoldStoreMissingError,
	LeaseLostError,
	TaskTimeoutError,
} from '../../errors';
import type { ClaimedTask } from '../../types';
import { backoff } from '../backoff';
import { Executor } from '../executor';
import type { ExecutorHooks } from '../executor';
import type { ExecutorOptions, HoldOptions } from '../options';
import type { PrecisionTimer } from '../precision-timer';
import type { ClaimedTaskRef, ExecutorTaskStore } from '../store';
import type {
	DispatchReporter,
	HoldReporter,
	HoldRun,
	HoldTaskHandler,
	TaskHandler,
	TaskHandlerRegistry,
} from '../task-handler';

const HOST = 'main-abc';
const LEASE_SECONDS = 60;
const RENEWAL_INTERVAL_MS = 15_000;
const HOLD: HoldOptions = { shutdownGraceMs: 1_000 };

const heldTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
	id: '1',
	jobId: 10,
	taskType: 'trigger:hold',
	payload: {},
	scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
	runAt: new Date('2026-07-01T00:00:00.000Z'),
	status: 'running',
	attempts: 0,
	maxAttempts: 3,
	timeoutSeconds: 300,
	leaseEpoch: 1,
	mode: 'hold',
	...overrides,
});

const claimOf = (task: ClaimedTask): ClaimedTaskRef => ({
	host: HOST,
	id: task.id,
	claimedEpoch: task.leaseEpoch,
});

const setup = (options: Partial<ExecutorOptions> = {}) => {
	const store = mock<Required<ExecutorTaskStore>>();
	const registry = mock<TaskHandlerRegistry>();
	const timer = mock<PrecisionTimer>();
	const hooks = {
		onMissingHandler: vi.fn(),
		onLeaseRenewal: vi.fn(),
		onTaskTimeout: vi.fn(),
		onHoldReady: vi.fn(),
		onHoldReleased: vi.fn(),
	} satisfies ExecutorHooks;
	store.beginDispatch.mockResolvedValue(1);
	store.markHeld.mockResolvedValue(1);
	store.releaseHeld.mockResolvedValue(1);
	store.releaseClaim.mockResolvedValue(1);
	store.renewLease.mockResolvedValue(true);
	store.rescheduleTask.mockResolvedValue(1);
	store.failTaskTerminal.mockResolvedValue(1);
	const executor = new Executor(
		store,
		registry,
		timer,
		{ leaseSeconds: LEASE_SECONDS, lookaheadSeconds: 5, batchSize: 100, hold: HOLD, ...options },
		hooks,
	);
	return { store, registry, timer, hooks, executor };
};

const holding = ({ ready = true, ignoreSignal = false, throwOnAbort = false } = {}) => {
	let signal!: AbortSignal;
	let finish!: () => void;
	let fail!: (error: Error) => void;
	const hold = vi.fn(async (_task: ClaimedTask, holder: HoldReporter, run: HoldRun) => {
		signal = run.signal;
		if (ready) await holder.ready();
		await new Promise<void>((resolve, reject) => {
			finish = resolve;
			fail = reject;
			if (ignoreSignal) return;
			const onAbort = () => (throwOnAbort ? reject(run.signal.reason as Error) : resolve());
			if (run.signal.aborted) onAbort();
			else run.signal.addEventListener('abort', onAbort);
		});
	});
	const handler: HoldTaskHandler = { mode: 'hold', hold };
	return {
		handler,
		hold,
		signal: () => signal,
		finish: () => finish(),
		fail: (error: Error) => fail(error),
	};
};

const onceHandler = (): TaskHandler => ({
	execute: vi.fn(async (_task: ClaimedTask, report: DispatchReporter) => {
		await Promise.resolve();
		return report.notDispatched();
	}),
});

describe('Executor hold mode', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('construction', () => {
		it.each<keyof ExecutorTaskStore>(['markHeld', 'releaseHeld'])(
			'throws HoldStoreMissingError when the store lacks %s',
			(method) => {
				const store = mock<ExecutorTaskStore>();
				Object.assign(store, { [method]: undefined });

				expect(
					() =>
						new Executor(store, mock<TaskHandlerRegistry>(), mock<PrecisionTimer>(), {
							leaseSeconds: LEASE_SECONDS,
							lookaheadSeconds: 5,
							batchSize: 100,
							hold: HOLD,
						}),
				).toThrow(HoldStoreMissingError);
			},
		);

		it('accepts a store without hold operations when hold is not set', () => {
			const store = mock<ExecutorTaskStore>();
			Object.assign(store, { markHeld: undefined, releaseHeld: undefined });

			expect(
				() =>
					new Executor(store, mock<TaskHandlerRegistry>(), mock<PrecisionTimer>(), {
						leaseSeconds: LEASE_SECONDS,
						lookaheadSeconds: 5,
						batchSize: 100,
					}),
			).not.toThrow();
		});
	});

	describe('claimAndSchedule', () => {
		it('asks for expired held tasks when hold is set', async () => {
			const { store, registry, executor } = setup();
			registry.registeredTypes.mockReturnValue(['trigger:hold']);
			store.claimDueTasks.mockResolvedValue([]);

			await executor.claimAndSchedule(HOST);

			expect(store.claimDueTasks).toHaveBeenCalledWith({
				host: HOST,
				taskTypes: ['trigger:hold'],
				leaseMs: LEASE_SECONDS * 1_000,
				lookaheadMs: 5_000,
				batchSize: 100,
				takeExpiredHeld: true,
			});
		});

		it('leaves the claim batch unchanged when hold is not set', async () => {
			const { store, registry, executor } = setup({ hold: undefined });
			registry.registeredTypes.mockReturnValue(['trigger:hold']);
			store.claimDueTasks.mockResolvedValue([]);

			await executor.claimAndSchedule(HOST);

			expect(store.claimDueTasks.mock.calls[0][0]).not.toHaveProperty('takeExpiredHeld');
		});
	});

	describe('handler mismatch', () => {
		it.each<
			[string, () => ClaimedTask, () => TaskHandler | HoldTaskHandler, Partial<ExecutorOptions>]
		>([
			['a hold task with a once handler', () => heldTask(), onceHandler, {}],
			[
				'a once task with a hold handler',
				() => heldTask({ mode: 'once' }),
				() => holding().handler,
				{},
			],
			[
				'a hold task when hold is not set',
				() => heldTask(),
				() => holding().handler,
				{ hold: undefined },
			],
		])('releases the claim and skips %s', async (_case, makeTask, makeHandler, options) => {
			const { store, registry, hooks, executor } = setup(options);
			const task = makeTask();
			registry.resolve.mockReturnValue(makeHandler());

			const result = await executor.fire(HOST, task);

			expect(result).toEqual({ outcome: 'skipped-no-handler' });
			expect(store.releaseClaim).toHaveBeenCalledWith(claimOf(task));
			expect(store.beginDispatch).not.toHaveBeenCalled();
			expect(hooks.onMissingHandler).toHaveBeenCalledWith(task);
		});

		it('treats a task with no mode as a once task', async () => {
			const { store, registry, executor } = setup();
			const task = heldTask({ mode: undefined });
			registry.resolve.mockReturnValue(holding().handler);

			await expect(executor.fire(HOST, task)).resolves.toEqual({ outcome: 'skipped-no-handler' });
			expect(store.releaseClaim).toHaveBeenCalledWith(claimOf(task));
		});
	});

	describe('fire', () => {
		it('does not run the holder when the dispatch mutex is lost', async () => {
			const { store, registry, executor } = setup();
			const { handler, hold } = holding();
			registry.resolve.mockReturnValue(handler);
			store.beginDispatch.mockResolvedValue(0);

			await expect(executor.fire(HOST, heldTask())).resolves.toEqual({
				outcome: 'skipped-not-owned',
			});
			expect(hold).not.toHaveBeenCalled();
		});

		it('takes the dispatch mutex with the task lease when the task has one', async () => {
			const { store, registry, executor } = setup();
			const { handler, finish } = holding();
			registry.resolve.mockReturnValue(handler);
			const task = heldTask({ leaseSeconds: 30 });

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(0);
			finish();
			await firing;

			expect(store.beginDispatch).toHaveBeenCalledWith(claimOf(task), 30_000);
		});

		it('marks the task held on ready and releases it with no delay on a clean return', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, hold, signal, finish } = holding();
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(0);

			expect(store.beginDispatch).toHaveBeenCalledWith(claimOf(task), LEASE_SECONDS * 1_000);
			expect(hold).toHaveBeenCalledWith(task, expect.any(Object), {
				signal: expect.any(AbortSignal),
			});
			expect(store.markHeld).toHaveBeenCalledWith(claimOf(task));
			expect(hooks.onHoldReady).toHaveBeenCalledWith(task);
			expect(signal().aborted).toBe(false);

			finish();

			await expect(firing).resolves.toEqual({ outcome: 'released' });
			expect(store.releaseHeld).toHaveBeenCalledWith(claimOf(task), 0, null);
			expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'returned');
			expect(store.rescheduleTask).not.toHaveBeenCalled();
			expect(store.completeTask).not.toHaveBeenCalled();
		});

		it('marks the task held once when ready is called twice', async () => {
			const { store, registry, executor } = setup();
			const handler: HoldTaskHandler = {
				mode: 'hold',
				hold: async (_task, holder) => {
					await holder.ready();
					await holder.ready();
				},
			};
			registry.resolve.mockReturnValue(handler);

			await expect(executor.fire(HOST, heldTask())).resolves.toEqual({ outcome: 'released' });
			expect(store.markHeld).toHaveBeenCalledTimes(1);
		});

		it('aborts the signal with a LeaseLostError when the held mark finds the claim gone', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, signal } = holding();
			registry.resolve.mockReturnValue(handler);
			store.markHeld.mockResolvedValue(0);
			const task = heldTask();

			const result = await executor.fire(HOST, task);

			expect(signal().reason).toBeInstanceOf(LeaseLostError);
			expect(hooks.onHoldReady).not.toHaveBeenCalled();
			expect(result).toEqual({ outcome: 'released' });
			expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'lease-lost');
		});

		it('reports a lost claim when the release matches no row', async () => {
			const { store, registry, hooks, executor } = setup();
			const handler: HoldTaskHandler = {
				mode: 'hold',
				hold: async (_task, holder) => await holder.ready(),
			};
			registry.resolve.mockReturnValue(handler);
			store.releaseHeld.mockResolvedValue(0);

			await expect(executor.fire(HOST, heldTask())).resolves.toEqual({
				outcome: 'skipped-not-owned',
			});
			expect(hooks.onHoldReleased).not.toHaveBeenCalled();
		});

		it.each([
			{ attempts: 0, maxAttempts: 3, outcome: 'rescheduled' },
			{ attempts: 2, maxAttempts: 3, outcome: 'dead-lettered' },
		])(
			'counts an attempt for a throw before ready (attempts $attempts of $maxAttempts)',
			async ({ attempts, maxAttempts, outcome }) => {
				const { store, registry, executor } = setup();
				const handler: HoldTaskHandler = {
					mode: 'hold',
					hold: async () => {
						throw new Error('arm failed');
					},
				};
				registry.resolve.mockReturnValue(handler);
				const task = heldTask({ attempts, maxAttempts });

				const result = await executor.fire(HOST, task);

				expect(result).toEqual({ outcome, errorMessage: 'arm failed' });
				expect(store.markHeld).not.toHaveBeenCalled();
				expect(store.releaseHeld).not.toHaveBeenCalled();
				if (outcome === 'rescheduled') {
					expect(store.rescheduleTask).toHaveBeenCalledWith(
						claimOf(task),
						backoff(attempts + 1),
						'arm failed',
					);
					expect(store.failTaskTerminal).not.toHaveBeenCalled();
				} else {
					expect(store.failTaskTerminal).toHaveBeenCalledWith(claimOf(task), 'arm failed');
					expect(store.rescheduleTask).not.toHaveBeenCalled();
				}
			},
		);

		it('releases with a backoff and counts no attempt for a throw after ready', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, fail } = holding();
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(0);
			fail(new Error('connection dropped'));

			await expect(firing).resolves.toEqual({
				outcome: 'released',
				errorMessage: 'connection dropped',
			});
			expect(store.releaseHeld).toHaveBeenCalledWith(
				claimOf(task),
				backoff(1),
				'connection dropped',
			);
			expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'error');
			expect(store.rescheduleTask).not.toHaveBeenCalled();
			expect(store.failTaskTerminal).not.toHaveBeenCalled();
		});
	});

	describe('start timeout', () => {
		const TIMEOUT_SECONDS = 10;

		it('aborts with a TaskTimeoutError when ready does not come in time', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, signal } = holding({ ready: false });
			registry.resolve.mockReturnValue(handler);
			const task = heldTask({ timeoutSeconds: TIMEOUT_SECONDS });

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(TIMEOUT_SECONDS * 1_000 - 1);
			expect(signal().aborted).toBe(false);

			await vi.advanceTimersByTimeAsync(1);
			expect(signal().reason).toBeInstanceOf(TaskTimeoutError);
			expect(hooks.onTaskTimeout).toHaveBeenCalledWith(task);

			await expect(firing).resolves.toMatchObject({ outcome: 'rescheduled' });
			expect(store.rescheduleTask).toHaveBeenCalledWith(
				claimOf(task),
				backoff(1),
				new TaskTimeoutError(TIMEOUT_SECONDS).message,
			);
			expect(store.releaseHeld).not.toHaveBeenCalled();
			expect(hooks.onHoldReleased).not.toHaveBeenCalled();
		});

		it('counts an attempt when the holder returns before ready', async () => {
			const { store, registry, executor } = setup();
			const handler: HoldTaskHandler = { mode: 'hold', hold: async () => {} };
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			await expect(executor.fire(HOST, task)).resolves.toEqual({
				outcome: 'rescheduled',
				errorMessage: 'The holder returned before it reported ready',
			});
			expect(store.rescheduleTask).toHaveBeenCalledWith(
				claimOf(task),
				backoff(1),
				'The holder returned before it reported ready',
			);
			expect(store.releaseHeld).not.toHaveBeenCalled();
		});

		it('counts an attempt when the holder throws on the start timeout', async () => {
			const { store, registry, executor } = setup();
			const { handler } = holding({ ready: false, throwOnAbort: true });
			registry.resolve.mockReturnValue(handler);
			const task = heldTask({ timeoutSeconds: TIMEOUT_SECONDS });

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(TIMEOUT_SECONDS * 1_000);

			await expect(firing).resolves.toMatchObject({ outcome: 'rescheduled' });
			expect(store.rescheduleTask).toHaveBeenCalledWith(
				claimOf(task),
				backoff(1),
				expect.any(String),
			);
		});

		it('never times out a holder that reported ready', async () => {
			const { registry, hooks, executor } = setup();
			const { handler, signal } = holding();
			registry.resolve.mockReturnValue(handler);
			const task = heldTask({ timeoutSeconds: TIMEOUT_SECONDS });

			void executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(100 * TIMEOUT_SECONDS * 1_000);

			expect(signal().aborted).toBe(false);
			expect(hooks.onTaskTimeout).not.toHaveBeenCalled();
		});
	});

	describe('lease renewal', () => {
		it('renews the lease while the holder runs and stops once it returns', async () => {
			const { store, registry, executor } = setup();
			const { handler, finish } = holding();
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(2 * RENEWAL_INTERVAL_MS);
			expect(store.renewLease).toHaveBeenCalledTimes(2);
			expect(store.renewLease).toHaveBeenCalledWith(claimOf(task), LEASE_SECONDS * 1_000);

			finish();
			await firing;
			await vi.advanceTimersByTimeAsync(3 * RENEWAL_INTERVAL_MS);
			expect(store.renewLease).toHaveBeenCalledTimes(2);
		});

		it.each([
			{ leaseSeconds: 60, fenceMarginMs: undefined, fenceAtMs: 55_000 },
			{ leaseSeconds: 16, fenceMarginMs: undefined, fenceAtMs: 14_000 },
			{ leaseSeconds: 60, fenceMarginMs: 10_000, fenceAtMs: 50_000 },
		])(
			'aborts with a LeaseLostError at $fenceAtMs ms when renewals fail (lease $leaseSeconds s, fence margin $fenceMarginMs)',
			async ({ leaseSeconds, fenceMarginMs, fenceAtMs }) => {
				const { store, registry, hooks, executor } = setup({
					leaseSeconds,
					hold: { ...HOLD, fenceMarginMs },
				});
				const { handler, signal } = holding();
				registry.resolve.mockReturnValue(handler);
				store.renewLease.mockRejectedValue(new Error('db down'));
				const task = heldTask();

				const firing = executor.fire(HOST, task);
				await vi.advanceTimersByTimeAsync(fenceAtMs - 1);
				expect(signal().aborted).toBe(false);

				await vi.advanceTimersByTimeAsync(1);
				expect(signal().reason).toBeInstanceOf(LeaseLostError);
				expect(hooks.onLeaseRenewal).toHaveBeenCalledWith(task, 'expired');
				expect(fenceAtMs).toBeLessThan(leaseSeconds * 1_000);

				await expect(firing).resolves.toEqual({ outcome: 'released' });
				expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'lease-lost');
			},
		);

		it('aborts with a LeaseLostError when a renewal finds the claim gone', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, signal } = holding();
			registry.resolve.mockReturnValue(handler);
			store.renewLease.mockResolvedValue(false);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS - 1);
			expect(signal().aborted).toBe(false);

			await vi.advanceTimersByTimeAsync(1);
			expect(signal().reason).toBeInstanceOf(LeaseLostError);
			expect(hooks.onLeaseRenewal).toHaveBeenCalledWith(task, 'lost');
			await expect(firing).resolves.toEqual({ outcome: 'released' });
		});

		it('renews each holder with its own claim', async () => {
			const { store, registry, executor } = setup();
			const first = holding();
			const second = holding();
			registry.resolve.mockReturnValueOnce(first.handler).mockReturnValueOnce(second.handler);
			const firstTask = heldTask({ id: '1', leaseEpoch: 4 });
			const secondTask = heldTask({ id: '2', leaseEpoch: 7 });

			void executor.fire(HOST, firstTask);
			void executor.fire(HOST, secondTask);
			await vi.advanceTimersByTimeAsync(RENEWAL_INTERVAL_MS);

			expect(store.renewLease).toHaveBeenCalledTimes(2);
			expect(store.renewLease).toHaveBeenCalledWith(claimOf(firstTask), LEASE_SECONDS * 1_000);
			expect(store.renewLease).toHaveBeenCalledWith(claimOf(secondTask), LEASE_SECONDS * 1_000);
			expect(first.signal().aborted).toBe(false);
			expect(second.signal().aborted).toBe(false);
		});
	});

	describe('stop', () => {
		it('aborts a running holder with a HolderShutdownError and releases it once it returns', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, signal } = holding();
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(0);
			const stopping = executor.stop();
			await vi.advanceTimersByTimeAsync(0);
			await stopping;

			expect(signal().reason).toBeInstanceOf(HolderShutdownError);
			await expect(firing).resolves.toEqual({ outcome: 'released' });
			expect(store.releaseHeld).toHaveBeenCalledWith(claimOf(task), 0, null);
			expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'shutdown');
			expect(store.releaseClaim).not.toHaveBeenCalled();
		});

		it('releases the claim of a holder that ignores the signal past the shutdown grace', async () => {
			const { store, registry, executor } = setup();
			const { handler, signal } = holding({ ignoreSignal: true });
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			void executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(0);
			let stopped = false;
			const stopping = executor.stop().then(() => {
				stopped = true;
			});

			await vi.advanceTimersByTimeAsync(HOLD.shutdownGraceMs - 1);
			expect(signal().reason).toBeInstanceOf(HolderShutdownError);
			expect(stopped).toBe(false);
			expect(store.releaseClaim).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			await stopping;
			expect(store.releaseClaim).toHaveBeenCalledWith(claimOf(task));
			expect(store.releaseHeld).not.toHaveBeenCalled();
		});

		it('still stops a newer holder of the same task after the older one returns', async () => {
			const { registry, executor } = setup();
			const older = holding({ ignoreSignal: true });
			const newer = holding();
			registry.resolve.mockReturnValueOnce(older.handler).mockReturnValueOnce(newer.handler);

			const firstFire = executor.fire(HOST, heldTask({ leaseEpoch: 1 }));
			await vi.advanceTimersByTimeAsync(0);
			void executor.fire(HOST, heldTask({ leaseEpoch: 2 }));
			await vi.advanceTimersByTimeAsync(0);
			older.finish();
			await firstFire;

			const stopping = executor.stop();
			await vi.advanceTimersByTimeAsync(0);
			await stopping;

			expect(newer.signal().reason).toBeInstanceOf(HolderShutdownError);
		});

		it('releases with no attempt a holder that throws on shutdown before ready', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler } = holding({ ready: false, throwOnAbort: true });
			registry.resolve.mockReturnValue(handler);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await vi.advanceTimersByTimeAsync(0);
			const stopping = executor.stop();
			await vi.advanceTimersByTimeAsync(0);
			await stopping;

			await expect(firing).resolves.toEqual({
				outcome: 'released',
				errorMessage: new HolderShutdownError().message,
			});
			expect(store.releaseHeld).toHaveBeenCalledWith(
				claimOf(task),
				0,
				new HolderShutdownError().message,
			);
			expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'shutdown');
			expect(store.rescheduleTask).not.toHaveBeenCalled();
			expect(store.failTaskTerminal).not.toHaveBeenCalled();
		});

		it('releases the claim without running the holder when stop came during the dispatch write', async () => {
			const { store, registry, hooks, executor } = setup();
			const { handler, hold } = holding();
			registry.resolve.mockReturnValue(handler);
			let finishDispatch!: (rows: number) => void;
			store.beginDispatch.mockReturnValue(
				new Promise((resolve) => {
					finishDispatch = resolve;
				}),
			);
			const task = heldTask();

			const firing = executor.fire(HOST, task);
			await executor.stop();
			finishDispatch(1);

			await expect(firing).resolves.toEqual({ outcome: 'released' });
			expect(hold).not.toHaveBeenCalled();
			expect(store.releaseClaim).toHaveBeenCalledWith(claimOf(task));
			expect(hooks.onHoldReleased).toHaveBeenCalledWith(task, 'shutdown');
		});
	});
});
