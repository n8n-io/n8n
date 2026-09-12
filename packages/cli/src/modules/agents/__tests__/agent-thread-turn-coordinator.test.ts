import {
	AgentThreadQueueFullError,
	MAX_AGENT_THREAD_WAITERS,
} from '../agent-thread-turn-coordinator';
import { createTestTurnCoordinator } from './test-utils/turn-coordinator';

const flush = async () => await new Promise((resolve) => setImmediate(resolve));

describe('AgentThreadTurnCoordinator', () => {
	it('runs same-thread turns one at a time in arrival order and lets other threads overlap', async () => {
		const { coordinator } = createTestTurnCoordinator();
		const events: string[] = [];
		const releases: Array<() => void> = [];
		const turn = async (thread: string, label: string) =>
			await coordinator.run(thread, undefined, async () => {
				events.push(`${label}:start`);
				await new Promise<void>((resolve) => releases.push(resolve));
				events.push(`${label}:end`);
			});

		const runs = [turn('t1', 'a'), turn('t1', 'b'), turn('t2', 'c'), turn('t1', 'd')];
		await flush();
		// a holds t1; c runs on t2 at the same time; b and d wait.
		expect(events).toEqual(['a:start', 'c:start']);

		releases[0]();
		await flush();
		expect(events).toEqual(['a:start', 'c:start', 'a:end', 'b:start']);

		releases.forEach((release) => release());
		await flush();
		releases.forEach((release) => release());
		await Promise.all(runs);
		expect(events.filter((e) => e.endsWith(':start'))).toEqual([
			'a:start',
			'c:start',
			'b:start',
			'd:start',
		]);
	});

	it('removes a waiter that aborts and never runs it', async () => {
		const { coordinator } = createTestTurnCoordinator();
		let releaseActive!: () => void;
		const active = coordinator.run('t1', undefined, async () => {
			await new Promise<void>((resolve) => (releaseActive = resolve));
		});
		const aborted = new AbortController();
		const body = vi.fn(async () => {});
		const waiter = coordinator.run('t1', aborted.signal, body);
		const later = vi.fn(async () => {});
		const next = coordinator.run('t1', undefined, later);
		await flush();

		aborted.abort(new Error('client left'));
		await expect(waiter).rejects.toThrow('client left');
		expect(body).not.toHaveBeenCalled();

		releaseActive();
		await Promise.all([active, next]);
		expect(later).toHaveBeenCalledOnce();
	});

	it('rejects a caller that was already aborted before it queued', async () => {
		const { coordinator } = createTestTurnCoordinator();
		const aborted = new AbortController();
		aborted.abort(new Error('gone'));
		const body = vi.fn(async () => {});

		await expect(coordinator.run('t1', aborted.signal, body)).rejects.toThrow('gone');
		expect(body).not.toHaveBeenCalled();
		// The thread is not left marked as active.
		await expect(coordinator.run('t1', undefined, async () => 'ran')).resolves.toBe('ran');
	});

	it(`accepts one active turn plus ${MAX_AGENT_THREAD_WAITERS} waiters and rejects the next`, async () => {
		const { coordinator } = createTestTurnCoordinator();
		let releaseActive!: () => void;
		const active = coordinator.run('t1', undefined, async () => {
			await new Promise<void>((resolve) => (releaseActive = resolve));
		});
		const waiters = Array.from(
			{ length: MAX_AGENT_THREAD_WAITERS },
			async () => await coordinator.run('t1', undefined, async () => {}),
		);
		await flush();

		const rejected = coordinator.run('t1', undefined, async () => {});
		await expect(rejected).rejects.toBeInstanceOf(AgentThreadQueueFullError);
		await expect(rejected).rejects.toMatchObject({ errorCode: 'agent_turn_queue_full' });

		// Another thread is unaffected by the full queue.
		await expect(coordinator.run('t2', undefined, async () => 'other')).resolves.toBe('other');

		releaseActive();
		await Promise.all([active, ...waiters]);
		// Once drained, the thread accepts turns again.
		await expect(coordinator.run('t1', undefined, async () => 'again')).resolves.toBe('again');
	});

	it('waits for a running row from another main before starting', async () => {
		vi.useFakeTimers();
		try {
			const { coordinator, executionRepository } = createTestTurnCoordinator();
			executionRepository.existsRunningByThread
				.mockResolvedValueOnce(true)
				.mockResolvedValueOnce(true)
				.mockResolvedValue(false);
			const body = vi.fn(async () => 'done');

			const run = coordinator.run('t1', undefined, body);
			await vi.advanceTimersByTimeAsync(999);
			expect(body).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(2_000);
			await expect(run).resolves.toBe('done');

			expect(executionRepository.existsRunningByThread).toHaveBeenCalledTimes(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not start a turn after losing the lease while waiting for a running row', async () => {
		const { coordinator, executionRepository, leases } = createTestTurnCoordinator();
		executionRepository.existsRunningByThread.mockResolvedValue(true);
		const body = vi.fn(async () => {});
		const run = coordinator.run('t1', undefined, body);
		await flush();

		leases[0].abort(new Error('lock lost'));
		await expect(run).rejects.toThrow('lock lost');
		expect(body).not.toHaveBeenCalled();

		executionRepository.existsRunningByThread.mockResolvedValue(false);
		await expect(coordinator.run('t1', undefined, async () => 'next')).resolves.toBe('next');
	});

	it('releases the local turn and the lease when the running-row wait is aborted', async () => {
		const { coordinator, executionRepository, leases } = createTestTurnCoordinator();
		executionRepository.existsRunningByThread.mockResolvedValue(true);
		const aborted = new AbortController();
		const run = coordinator.run('t1', aborted.signal, async () => {});
		await flush();

		aborted.abort(new Error('stop waiting'));
		await expect(run).rejects.toThrow('stop waiting');
		expect(leases[0].signal.aborted).toBe(true);

		executionRepository.existsRunningByThread.mockResolvedValue(false);
		await expect(coordinator.run('t1', undefined, async () => 'next')).resolves.toBe('next');
	});

	it('holds the lease for the whole generator and exposes its loss on the permit', async () => {
		const { coordinator, lockService, leases } = createTestTurnCoordinator();
		const seen: string[] = [];

		const stream = coordinator.stream('t1', undefined, async function* (permit) {
			expect(permit.threadId).toBe('t1');
			yield 'one';
			leases[0].abort(new Error('lock lost'));
			expect(permit.leaseLost.aborted).toBe(true);
			yield 'two';
		});
		for await (const value of stream) seen.push(value);

		expect(seen).toEqual(['one', 'two']);
		expect(lockService.withLease).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			'agent-thread-turn:t1',
			expect.any(Function),
		);
		// A consumer that stops early still releases the turn.
		const partial = coordinator.stream('t1', undefined, async function* () {
			yield 'a';
			yield 'b';
		});
		await partial.next();
		await partial.return(undefined);
		await expect(coordinator.run('t1', undefined, async () => 'free')).resolves.toBe('free');
	});
});
