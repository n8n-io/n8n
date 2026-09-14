import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
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

	constructor(readonly threadId: string) {}
}
export type { AgentThreadTurnPermit };

export interface AgentThreadTurnAdmission {
	permit: AgentThreadTurnPermit;
	release: () => void;
}

/**
 * Admits one agent turn per durable thread at a time.
 *
 * Waiters on one main form a FIFO per thread, bounded by
 * {@link MAX_AGENT_THREAD_WAITERS}. The admitted turn then waits until no
 * running row exists for the thread, which covers turns on other mains and
 * rows from mains that predate the claim column. The database claim on the
 * running row is the fail-closed fence behind this wait.
 */
@Service()
export class AgentThreadTurnCoordinator {
	/** Threads with an active turn in this process, with their waiting turns in arrival order. */
	private readonly waiters = new Map<string, Array<() => void>>();

	constructor(private readonly executionRepository: AgentExecutionRepository) {}

	/** Run `fn` as the thread's only turn. */
	async run<T>(
		threadId: string,
		signal: AbortSignal | undefined,
		fn: (permit: AgentThreadTurnPermit) => Promise<T>,
	): Promise<T> {
		const { permit, release } = await this.acquire(threadId, signal);
		try {
			return await fn(permit);
		} finally {
			release();
		}
	}

	/** Like {@link run} for a generator: the turn is held until the consumer finishes. */
	async *stream<T>(
		threadId: string,
		signal: AbortSignal | undefined,
		fn: (permit: AgentThreadTurnPermit) => AsyncGenerator<T>,
	): AsyncGenerator<T> {
		const { permit, release } = await this.acquire(threadId, signal);
		try {
			yield* fn(permit);
		} finally {
			release();
		}
	}

	/**
	 * Wait for the turn. Rejects with {@link AgentThreadQueueFullError} when the
	 * thread already has the maximum number of waiters on this main, and with
	 * the signal's reason when the caller aborts while waiting.
	 */
	async acquire(threadId: string, signal?: AbortSignal): Promise<AgentThreadTurnAdmission> {
		signal?.throwIfAborted();
		await this.admitLocally(threadId, signal);
		try {
			await this.waitUntilThreadIdle(threadId, signal);
			signal?.throwIfAborted();
		} catch (error) {
			this.releaseLocally(threadId);
			throw error;
		}
		return {
			permit: new AgentThreadTurnPermit(threadId),
			release: () => this.releaseLocally(threadId),
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
			const waiter = () => {
				signal?.removeEventListener('abort', onAbort);
				resolve();
			};
			queue.push(waiter);
			signal?.addEventListener('abort', onAbort, { once: true });
		});
	}

	/** Hand the turn to the next local waiter, or forget the thread when idle. */
	private releaseLocally(threadId: string): void {
		const next = this.waiters.get(threadId)?.shift();
		if (next) next();
		else this.waiters.delete(threadId);
	}
}
