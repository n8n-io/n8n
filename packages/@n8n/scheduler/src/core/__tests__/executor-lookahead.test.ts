import {
	Executor,
	PrecisionTimer,
	TaskHandlerRegistry,
	type ClaimDueTasksBatch,
	type ExecutorTaskStore,
} from '../executor';
import { Loop, executorLookaheadSeconds } from '../lifecycle';
import type { ClaimedTask } from '../types';

/**
 * End-to-end check that the executor claims far enough ahead to fire every task
 * on time, driven through the real {@link Loop}, {@link Timeline}, {@link Executor}
 * and {@link PrecisionTimer} over an in-memory store.
 *
 * Symmetric per-slot jitter makes two consecutive ticks up to
 * interval·(1 + 2·jitterRatio) apart: a tick can land jitterRatio·interval early
 * and the next that much late. The scripted `random` below forces exactly that
 * worst case, so a task due in the tail of the gap is only claimable on the
 * earlier tick if the lookahead ({@link executorLookaheadSeconds}) covers the
 * whole span. A lookahead that budgets only one side of the jitter leaves the
 * task to the next tick, by which point it is past due and fires late.
 */
describe('executor claims far enough ahead to fire on time', () => {
	const HOST = 'main-abc';
	const TASK_TYPE = 'workflow:schedule-trigger';

	const INTERVAL_MS = 10_000;
	const JITTER_RATIO = 0.1;

	beforeEach(() => {
		vi.useFakeTimers({ now: 0 });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const task = (id: string, runAtMs: number): ClaimedTask => ({
		id,
		jobId: 1,
		taskType: TASK_TYPE,
		payload: {},
		scheduledFor: new Date(runAtMs),
		runAt: new Date(runAtMs),
		status: 'pending',
		attempts: 0,
		maxAttempts: 1,
		leaseEpoch: 0,
	});

	/** In-memory store: due-ness read against the DB clock at query time, as a real store does. */
	class FakeStore implements ExecutorTaskStore {
		private pending: ClaimedTask[];

		constructor(pending: ClaimedTask[]) {
			this.pending = [...pending];
		}

		async claimDueTasks(batch: ClaimDueTasksBatch): Promise<ClaimedTask[]> {
			const horizon = Date.now() + batch.lookaheadMs;
			const due = this.pending
				.filter((t) => batch.taskTypes.includes(t.taskType) && t.runAt.getTime() <= horizon)
				.slice(0, batch.batchSize);
			this.pending = this.pending.filter((t) => !due.includes(t));
			return await Promise.resolve(
				due.map((t) => ({ ...t, status: 'running' as const, leaseEpoch: t.leaseEpoch + 1 })),
			);
		}

		async markStarted(): Promise<number> {
			return await Promise.resolve(1);
		}
		async completeTask(): Promise<number> {
			return await Promise.resolve(1);
		}
		async failTaskTerminal(): Promise<number> {
			return await Promise.resolve(1);
		}
		async rescheduleTask(): Promise<number> {
			return await Promise.resolve(1);
		}
		async releaseClaim(): Promise<number> {
			return await Promise.resolve(1);
		}
	}

	it('fires a task due in the widest inter-tick gap on time, not a tick late', async () => {
		// Scripted random forces the worst-case timeline:
		//   tick0 anchor at INTERVAL·0.5 = 5_000 (un-jittered),
		//   tick1 jittered fully early  (-0.1·INTERVAL) -> 15_000 - 1_000 = 14_000,
		//   tick2 jittered fully late   (+0.1·INTERVAL) -> 25_000 + 1_000 = 26_000.
		// The tick1->tick2 gap is 12_000 = INTERVAL·(1 + 2·0.1), the widest possible.
		const randoms = [0.5, 0, 1];
		const random = () => randoms.shift() ?? 0.5;

		// EARLY (12_000) is inside tick0's horizon and claimed there: the pipeline fires
		// a normal task exactly on time. TAIL (25_500) sits in (tick1 + INTERVAL·(1+jitter),
		// tick2]: reachable from tick1 only if the lookahead covers the full 2·jitter gap.
		const store = new FakeStore([task('early', 12_000), task('tail', 25_500)]);
		const registry = new TaskHandlerRegistry();
		const firedAt = new Map<string, number>();
		registry.register(TASK_TYPE, {
			execute: async (t) => {
				firedAt.set(t.id, Date.now());
				await Promise.resolve();
			},
		});

		const executor = new Executor(store, registry, new PrecisionTimer(), {
			leaseSeconds: 60,
			lookaheadSeconds: executorLookaheadSeconds(INTERVAL_MS / 1_000, JITTER_RATIO),
			batchSize: 100,
		});

		const loop = new Loop(
			async () => await executor.claimAndSchedule(HOST),
			{
				intervalMs: INTERVAL_MS,
				jitterRatio: JITTER_RATIO,
				timeoutMs: 60_000,
				concurrency: 'sequential',
				maxConcurrent: 1,
			},
			{ onError: () => {}, onTimeout: () => {}, onSkippedTick: () => {} },
			random,
		);

		loop.start();
		await vi.advanceTimersByTimeAsync(27_000);

		expect(firedAt.get('early')).toBe(12_000);
		expect(firedAt.get('tail')).toBe(25_500);

		await loop.stop();
		await executor.stop();
	});
});
