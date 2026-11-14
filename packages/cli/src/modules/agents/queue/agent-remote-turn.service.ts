import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { JsonObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { AgentClusterService } from '../agent-cluster.service';
import { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import { AgentTurnRequestRepository } from '../repositories/agent-turn-request.repository';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { AgentTurnQueue } from './agent-turn-queue.service';
import type { AgentTurnRequestPayload } from './agent-turn-request.types';

/** The stream key of a turn request that runs on another process. */
export const requestStreamKey = (requestId: string) => `request:${requestId}`;

type Kind = AgentTurnRequestPayload['kind'];
type PayloadOf<K extends Kind> = Extract<AgentTurnRequestPayload, { kind: K }>;

/** Where the main that holds the connection receives the events of a turn. */
export interface AgentRemoteDelivery {
	send: (event: AgentSseEvent) => void;
	/** Aborts when the caller leaves. */
	abortSignal: AbortSignal;
}

/** What a handler gets when it runs a request on this process. */
export interface AgentRemoteTurnContext {
	requestId: string;
	/** Aborts when the main that holds the connection stops waiting for the turn. */
	abortSignal: AbortSignal;
}

/** A turn that streams events to the caller, such as a chat resume. */
export interface AgentStreamTurnHandler<K extends Kind> {
	mode: 'stream';
	run: (
		payload: PayloadOf<K>,
		context: AgentRemoteTurnContext & { send: (event: AgentSseEvent) => void },
	) => Promise<void>;
	/** Sends the error of a turn that failed before it could report it. */
	onError: (error: unknown, send: (event: AgentSseEvent) => void) => void;
}

/** A turn whose caller waits for one reply, such as a webhook call. */
export interface AgentResultTurnHandler<K extends Kind> {
	mode: 'result';
	run: (payload: PayloadOf<K>, context: AgentRemoteTurnContext) => Promise<JsonObject>;
}

/** A turn that no caller waits for, such as the resume of a workflow tool. */
export interface AgentDetachedTurnHandler<K extends Kind> {
	mode: 'detached';
	run: (payload: PayloadOf<K>, context: AgentRemoteTurnContext) => Promise<void>;
}

export type AgentTurnHandler<K extends Kind> =
	| AgentStreamTurnHandler<K>
	| AgentResultTurnHandler<K>
	| AgentDetachedTurnHandler<K>;

/**
 * - `local`: no worker took the turn. The caller runs it in this process.
 * - `done`: a worker ran the turn and stored its outcome.
 * - `lost`: the worker that ran the turn left before it stored an outcome.
 * - `left`: the caller left, so the turn was stopped.
 */
export type AgentRemoteResult =
	| { outcome: 'local' }
	| { outcome: 'done'; result: JsonObject }
	| { outcome: 'lost' }
	| { outcome: 'left' };

/**
 * Runs an agent turn on an agent worker while a main holds the connection of
 * the caller.
 *
 * The main stores the input of the turn in an `agent_turn_request` row and
 * sends a request job. The worker that claims the row runs the turn. A
 * streamed turn relays its events to the main. A turn whose caller waits for
 * one reply stores its outcome in the row. When no worker claims the row in
 * time, the main claims it and runs the turn itself. Each row is claimed
 * once, so a turn runs at most once.
 *
 * The worker stops a turn when its row goes away, so a main that stops
 * waiting removes the row. That is how a caller that leaves stops a turn on
 * another process.
 */
@Service()
export class AgentRemoteTurnService {
	/** How often the main checks a remote turn while it waits. */
	static readonly POLL_INTERVAL_MS = 1_000;

	/** A streamed turn that sends nothing for this long is treated as lost. */
	static readonly RELAY_TIMEOUT_MS = 30_000;

	/** How often the main checks that the worker that runs a result turn is alive. */
	static readonly OWNER_CHECK_INTERVAL_MS = 10_000;

	/** How often the worker checks that the main still waits for a turn. */
	static readonly WANTED_CHECK_INTERVAL_MS = 2_000;

	/** Requests older than this are left over from a crash. */
	static readonly STALE_REQUEST_MS = 60 * 60 * 1_000;

	private readonly handlers = new Map<Kind, AgentTurnHandler<Kind>>();

	constructor(
		private readonly logger: Logger,
		private readonly cluster: AgentClusterService,
		private readonly placement: AgentTurnPlacement,
		private readonly turnQueue: AgentTurnQueue,
		private readonly requests: AgentTurnRequestRepository,
		private readonly streams: AgentQueuedTestStreamService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Register how this process runs one kind of request. */
	handle<K extends Kind>(kind: K, handler: AgentTurnHandler<K>): void {
		// Each handler only receives the payload of its own kind, see `runRequest`.
		this.handlers.set(kind, handler);
	}

	/** Whether this main can send turns to agent workers now. */
	async canDispatch(): Promise<boolean> {
		return this.placement.dispatchEnabled && (await this.placement.workersAvailable());
	}

	/**
	 * Send a streamed turn to a worker and relay its events. Returns `false`
	 * when this main must run the turn itself: no worker is up, the job could
	 * not be sent, or no worker claimed the request in time.
	 *
	 * With `stopOnLeave`, a caller that leaves stops the turn. Without it, the
	 * turn runs to its end, as a local turn does.
	 */
	async stream(
		payload: AgentTurnRequestPayload,
		delivery: AgentRemoteDelivery,
		options: { stopOnLeave: boolean },
	): Promise<boolean> {
		if (!(await this.canDispatch())) return false;

		const requestId = await this.create(payload);
		let finished = false;
		// The connection stays open after a remote end, so that this main can
		// still report a lost worker. The caller closes it.
		const subscription = this.streams.subscribe(requestStreamKey(requestId), {
			send: delivery.send,
			abortSignal: delivery.abortSignal,
			close: () => {
				finished = true;
			},
		});
		let keepRow = false;
		try {
			if (!(await this.send(requestId))) return !(await this.claimHere(requestId));

			const sentAt = Date.now();
			let claimedSeenAt: number | undefined;
			while (!finished) {
				await sleep(AgentRemoteTurnService.POLL_INTERVAL_MS);
				if (finished) break;
				if (delivery.abortSignal.aborted) {
					// The worker removes the row when the turn ends.
					keepRow = !options.stopOnLeave;
					break;
				}
				if (claimedSeenAt === undefined) {
					if (await this.requests.isPending(requestId)) {
						if (Date.now() - sentAt < AgentTurnPlacement.FALLBACK_WAIT_MS) continue;
						if (await this.claimHere(requestId)) return false;
					}
					claimedSeenAt = Date.now();
					continue;
				}
				const lastSign = Math.max(subscription.lastEventAt(), claimedSeenAt);
				if (Date.now() - lastSign >= AgentRemoteTurnService.RELAY_TIMEOUT_MS) {
					this.logger.warn('Lost the worker that runs an agent turn', {
						requestId,
						kind: payload.kind,
					});
					delivery.send({
						type: 'error',
						message: 'The agent stopped responding. Reload the chat to see its latest state.',
					});
					break;
				}
			}
			return true;
		} finally {
			subscription.close();
			if (!keepRow) await this.requests.remove(requestId).catch(() => {});
		}
	}

	/**
	 * Send a turn whose caller waits for one reply to a worker, and wait for
	 * its outcome. A caller that leaves stops the turn.
	 */
	async result(
		payload: AgentTurnRequestPayload,
		abortSignal: AbortSignal,
	): Promise<AgentRemoteResult> {
		if (!(await this.canDispatch())) return { outcome: 'local' };

		const requestId = await this.create(payload);
		try {
			if (!(await this.send(requestId))) {
				return (await this.claimHere(requestId)) ? { outcome: 'local' } : this.lost(requestId);
			}

			const sentAt = Date.now();
			let ownerCheckedAt = Date.now();
			while (!abortSignal.aborted) {
				await sleep(AgentRemoteTurnService.POLL_INTERVAL_MS);
				if (abortSignal.aborted) break;
				const state = await this.requests.findState(requestId);
				if (!state) return this.lost(requestId);
				if (state.result) return { outcome: 'done', result: state.result };
				if (state.claimedBy === null) {
					if (Date.now() - sentAt < AgentTurnPlacement.FALLBACK_WAIT_MS) continue;
					if (await this.claimHere(requestId)) return { outcome: 'local' };
					continue;
				}
				if (Date.now() - ownerCheckedAt < AgentRemoteTurnService.OWNER_CHECK_INTERVAL_MS) continue;
				ownerCheckedAt = Date.now();
				const alive = await this.cluster.activeInstanceKeys();
				// A failed registry read is not a sign of a lost worker.
				if (alive && !alive.has(state.claimedBy)) return this.lost(requestId);
			}
			return { outcome: 'left' };
		} finally {
			await this.requests.remove(requestId).catch(() => {});
		}
	}

	/**
	 * Send a turn that no caller waits for to a worker. Returns `false` when
	 * this process must run it in its own way: no worker is up, or the job
	 * could not be sent. When no worker claims the request in time, this
	 * process claims it and calls `fallback`. A process that stops before then
	 * leaves the job to the workers.
	 */
	async detached(
		payload: AgentTurnRequestPayload,
		fallback: () => Promise<void>,
	): Promise<boolean> {
		if (!(await this.placement.workersAvailable())) return false;

		const requestId = await this.create(payload);
		if (!(await this.send(requestId))) {
			await this.requests.remove(requestId).catch(() => {});
			return false;
		}
		void this.fallBackWhenUnclaimed(requestId, payload.kind, fallback);
		return true;
	}

	private async fallBackWhenUnclaimed(
		requestId: string,
		kind: Kind,
		fallback: () => Promise<void>,
	): Promise<void> {
		await sleep(AgentTurnPlacement.FALLBACK_WAIT_MS, undefined, { ref: false });
		try {
			if (!(await this.claimHere(requestId))) return;
			await this.requests.remove(requestId).catch(() => {});
			await fallback();
		} catch (error) {
			this.logger.warn('Failed to run an agent turn that no worker took', {
				requestId,
				kind,
				error,
			});
		}
	}

	/** Run a request job on this worker. */
	async runRequest(requestId: string): Promise<void> {
		const claimant = this.cluster.instanceKey;
		if (!claimant) return;
		const payload = await this.requests.claim(requestId, claimant);
		if (!payload) return;
		const handler = this.handlers.get(payload.kind);
		if (!handler) {
			this.logger.warn('No handler for an agent turn request on this process', {
				requestId,
				kind: payload.kind,
			});
			await this.requests.remove(requestId).catch(() => {});
			return;
		}

		const abort = new AbortController();
		const stopWatch = this.watchWanted(requestId, abort);
		const context = { requestId, abortSignal: abort.signal };
		try {
			if (handler.mode === 'detached') {
				try {
					await handler.run(payload, context);
				} finally {
					await this.requests.remove(requestId).catch(() => {});
				}
				return;
			}
			if (handler.mode === 'result') {
				const result = await handler.run(payload, context);
				// The main removes the row once it reads the result.
				await this.requests.complete(requestId, result);
				return;
			}
			const sender = this.streams.createSender(requestStreamKey(requestId));
			try {
				await handler.run(payload, { ...context, send: sender.send });
			} catch (error) {
				handler.onError(error, sender.send);
			} finally {
				await sender.close();
				await this.requests.remove(requestId).catch(() => {});
			}
		} catch (error) {
			// A result turn reports its own errors. This is a failure to store the
			// result, or a failed detached turn.
			this.logger.warn('Failed to finish an agent turn request', {
				requestId,
				kind: payload.kind,
				error,
			});
		} finally {
			stopWatch();
		}
	}

	/** Stop the turn when the main removes its row. */
	private watchWanted(requestId: string, abort: AbortController): () => void {
		const timer = setInterval(() => {
			this.requests
				.findState(requestId)
				.then((state) => {
					if (!state) abort.abort();
				})
				.catch(() => {
					// A failed read is not a stop. The heartbeat of the turn handles a lost database.
				});
		}, AgentRemoteTurnService.WANTED_CHECK_INTERVAL_MS);
		timer.unref();
		return () => clearInterval(timer);
	}

	private async create(payload: AgentTurnRequestPayload): Promise<string> {
		this.removeStaleRequests();
		const requestId = randomUUID();
		await this.requests.createPending(requestId, payload);
		return requestId;
	}

	private async send(requestId: string): Promise<boolean> {
		try {
			await this.turnQueue.enqueueRequest(requestId);
			return true;
		} catch (error) {
			this.logger.warn('Failed to send an agent turn to a worker', { requestId, error });
			return false;
		}
	}

	private lost(requestId: string): AgentRemoteResult {
		this.logger.warn('Lost the worker that runs an agent turn', { requestId });
		return { outcome: 'lost' };
	}

	private async claimHere(requestId: string): Promise<boolean> {
		const claimant = this.cluster.instanceKey ?? `main:${randomUUID()}`;
		return (await this.requests.claim(requestId, claimant)) !== null;
	}

	/** Remove the rows that a crashed main left behind. No caller waits for them. */
	removeStaleRequests(): void {
		const cutoff = new Date(Date.now() - AgentRemoteTurnService.STALE_REQUEST_MS);
		this.requests.removeOlderThan(cutoff).catch((error: unknown) => {
			this.logger.debug('Failed to remove stale agent turn requests', { error });
		});
	}
}
