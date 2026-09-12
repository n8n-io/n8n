import { LockNamespace, LockService } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';
import { UserError } from 'n8n-workflow';

import { AgentExecutionRepository } from './repositories/agent-execution.repository';

/** Waiting turns per thread on one main. The active turn does not count. */
export const MAX_AGENT_THREAD_WAITERS = 50;
export const AGENT_TURN_QUEUE_FULL_ERROR_CODE = 'agent_turn_queue_full';

/** How often a waiting turn checks whether a running row from another main is gone. */
const RUNNING_ROW_POLL_MS = 1_000;

export class AgentThreadQueueFullError extends UserError {
	readonly errorCode = AGENT_TURN_QUEUE_FULL_ERROR_CODE;

	constructor() {
		super(
			`This thread already has ${MAX_AGENT_THREAD_WAITERS} messages waiting. Try again after the agent processes a message.`,
		);
	}
}

/**
 * Proof that the holder is the only active turn on `threadId`. Only the
 * coordinator creates permits; the private brand keeps the type nominal.
 */
class AgentThreadTurnPermit {
	private declare readonly issuedByCoordinator: true;

	constructor(
		readonly threadId: string,
		/** Aborts when the distributed lease is lost while the turn runs. */
		readonly leaseLost: AbortSignal,
	) {}
}
export type { AgentThreadTurnPermit };

export interface AgentThreadTurnLease {
	permit: AgentThreadTurnPermit;
	release: () => Promise<void>;
}

interface Waiter {
	resolve: () => void;
}

/**
 * Admits one agent turn per durable thread at a time.
 *
 * Waiters on one main form a FIFO per thread, bounded by
 * {@link MAX_AGENT_THREAD_WAITERS}. The admitted turn then takes the
 * distributed `agent-thread-turn:<threadId>` lease for cross-main exclusion
 * and waits until no running row exists for the thread, which also covers
 * rows from mains that predate the claim column. The database claim on the
 * running row is the fail-closed fence behind the lease.
 */
@Service()
export class AgentThreadTurnCoordinator {
	/** Threads with an active turn in this process, with their waiting turns in arrival order. */
	private readonly waiters = new Map<string, Waiter[]>();

	constructor(
		private readonly lockService: LockService,
		private readonly executionRepository: AgentExecutionRepository,
	) {}

	/** Run `fn` as the thread's only turn. */
	async run<T>(
		threadId: string,
		signal: AbortSignal | undefined,
		fn: (permit: AgentThreadTurnPermit) => Promise<T>,
	): Promise<T> {
		const lease = await this.acquire(threadId, signal);
		try {
			return await fn(lease.permit);
		} finally {
			await lease.release();
		}
	}

	/** Like {@link run} for a generator: the turn is held until the consumer finishes. */
	async *stream<T>(
		threadId: string,
		signal: AbortSignal | undefined,
		fn: (permit: AgentThreadTurnPermit) => AsyncGenerator<T>,
	): AsyncGenerator<T> {
		const lease = await this.acquire(threadId, signal);
		try {
			yield* fn(lease.permit);
		} finally {
			await lease.release();
		}
	}

	/**
	 * Wait for the turn. Rejects with {@link AgentThreadQueueFullError} when the
	 * thread already has the maximum number of waiters on this main, and with
	 * the signal's reason when the caller aborts while waiting.
	 */
	async acquire(threadId: string, signal?: AbortSignal): Promise<AgentThreadTurnLease> {
		signal?.throwIfAborted();
		await this.admitLocally(threadId, signal);
		let lease: Awaited<ReturnType<typeof this.acquireLease>> | undefined;
		try {
			lease = await this.acquireLease(threadId);
			const idleWaitSignal = AbortSignal.any(
				[signal, lease.leaseLost].filter((s) => s !== undefined),
			);
			await this.waitUntilThreadIdle(threadId, idleWaitSignal);
			signal?.throwIfAborted();
			lease.leaseLost.throwIfAborted();
		} catch (error) {
			await lease?.release();
			this.releaseLocally(threadId);
			throw error;
		}
		const { leaseLost, release: releaseLease } = lease;
		return {
			permit: new AgentThreadTurnPermit(threadId, leaseLost),
			release: async () => {
				await releaseLease();
				this.releaseLocally(threadId);
			},
		};
	}

	/**
	 * Resolve once no execution row for the thread is running. Polls because a
	 * row from another main only ends through that main or the sweeper.
	 */
	async waitUntilThreadIdle(threadId: string, signal?: AbortSignal): Promise<void> {
		while (await this.executionRepository.existsRunningByThread(threadId)) {
			await sleep(RUNNING_ROW_POLL_MS, signal);
		}
	}

	/** Take an idle thread at once, otherwise wait behind the local turns ahead. */
	private async admitLocally(threadId: string, signal?: AbortSignal): Promise<void> {
		const queue = this.waiters.get(threadId);
		if (!queue) {
			this.waiters.set(threadId, []);
			return;
		}
		if (queue.length >= MAX_AGENT_THREAD_WAITERS) throw new AgentThreadQueueFullError();
		await new Promise<void>((resolve, reject) => {
			const onAbort = () => {
				const index = queue.indexOf(waiter);
				if (index !== -1) queue.splice(index, 1);
				reject(ensureError(signal?.reason));
			};
			const waiter: Waiter = {
				resolve: () => {
					signal?.removeEventListener('abort', onAbort);
					resolve();
				},
			};
			queue.push(waiter);
			signal?.addEventListener('abort', onAbort, { once: true });
		});
	}

	/** Hand the turn to the next local waiter, or forget the thread when idle. */
	private releaseLocally(threadId: string): void {
		const next = this.waiters.get(threadId)?.shift();
		if (next) next.resolve();
		else this.waiters.delete(threadId);
	}

	/**
	 * Hold the distributed lease as a handle instead of a callback scope, so a
	 * generator can keep it until its consumer is done.
	 */
	private async acquireLease(
		threadId: string,
	): Promise<{ leaseLost: AbortSignal; release: () => Promise<void> }> {
		const acquired = createDeferredPromise<AbortSignal>();
		const released = createDeferredPromise();
		const held = this.lockService
			.withLease(LockNamespace.KNOWN_LOCKS, `agent-thread-turn:${threadId}`, async (signal) => {
				acquired.resolve(signal);
				await released.promise;
			})
			.catch((error: Error) => acquired.reject(error));
		const leaseLost = await acquired.promise;
		return {
			leaseLost,
			release: async () => {
				released.resolve();
				await held;
			},
		};
	}
}
