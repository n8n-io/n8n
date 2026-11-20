import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { JsonObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { AgentClusterService } from '../agent-cluster.service';
import { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import { AgentTurnRequestRepository } from '../repositories/agent-turn-request.repository';
import { busyEvent } from './agent-busy-event';
import { AgentTurnGate, requestTurnClass, TURN_PRIORITY } from './agent-turn-gate.service';
import { AgentTurnHandlers } from './agent-turn-handlers.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { AgentTurnQueue } from './agent-turn-queue.service';
import type { AgentTurnRequestPayload } from './agent-turn-request.types';

/** The stream key of a turn request that runs on another process. */
export const requestStreamKey = (requestId: string) => `request:${requestId}`;

type Kind = AgentTurnRequestPayload['kind'];

/** Where the main that holds the connection receives the events of a turn. */
export interface AgentRemoteDelivery {
	send: (event: AgentSseEvent) => void;
	/** Aborts when the caller leaves. */
	abortSignal: AbortSignal;
}

/**
 * - `local`: no worker took the turn. The caller runs it in this process.
 * - `done`: a worker ran the turn and stored its outcome.
 * - `lost`: the worker that ran the turn left before it stored an outcome.
 * - `left`: the caller left, so the turn was stopped.
 * - `busy`: n8n has no room for the turn now. The caller can try again after
 *   `retryAfterSeconds`.
 */
export type AgentRemoteResult =
	| { outcome: 'local' }
	| { outcome: 'done'; result: JsonObject }
	| { outcome: 'lost' }
	| { outcome: 'left' }
	| { outcome: 'busy'; retryAfterSeconds: number };

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

	/** How often a process checks again whether it may take over an unclaimed detached turn. */
	static readonly DETACHED_RECHECK_MS = 5_000;

	/** Requests older than this are left over from a crash. */
	static readonly STALE_REQUEST_MS = 60 * 60 * 1_000;

	constructor(
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly cluster: AgentClusterService,
		private readonly placement: AgentTurnPlacement,
		private readonly gate: AgentTurnGate,
		private readonly turnQueue: AgentTurnQueue,
		private readonly requests: AgentTurnRequestRepository,
		private readonly streams: AgentQueuedTestStreamService,
		private readonly handlers: AgentTurnHandlers,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Whether too many turns wait for agent workers. Gives the busy result when they do. */
	private async workerQueueFull(): Promise<
		Extract<AgentRemoteResult, { outcome: 'busy' }> | undefined
	> {
		if (!(await this.placement.queueFull(true))) return undefined;
		return { outcome: 'busy', retryAfterSeconds: await this.placement.retryAfterSeconds() };
	}

	/**
	 * Send a streamed turn to a worker and relay its events. Returns `false`
	 * when this main must run the turn itself: the job could not be sent, or
	 * no worker claimed the request in time.
	 *
	 * Returns `true` after it sends a busy error when n8n has no room for the
	 * turn: too many turns wait, or no process started the turn within
	 * `N8N_AGENTS_QUEUE_MAX_WAIT`.
	 *
	 * With `stopOnLeave`, a caller that leaves stops the turn. Without it, the
	 * turn runs to its end, as a local turn does.
	 */
	async stream(
		payload: AgentTurnRequestPayload,
		delivery: AgentRemoteDelivery,
		options: { stopOnLeave: boolean },
	): Promise<boolean> {
		const full = await this.workerQueueFull();
		if (full) {
			delivery.send(busyEvent('queue-full', full.retryAfterSeconds));
			return true;
		}

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
			if (!(await this.send(requestId, payload.kind))) return !(await this.claimHere(requestId));

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
						if (await this.takeOverIfDue(requestId, sentAt)) return false;
						if (await this.giveUpIfOverdue(requestId, sentAt)) {
							delivery.send(busyEvent('wait-too-long', await this.placement.retryAfterSeconds()));
							return true;
						}
						continue;
					}
					claimedSeenAt = Date.now();
					continue;
				}
				const lastSign = Math.max(subscription.lastEventAt(), claimedSeenAt);
				if (Date.now() - lastSign >= AgentRemoteTurnService.RELAY_TIMEOUT_MS) {
					this.lost(requestId, payload.kind);
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
			if (!keepRow) await this.removeQuietly(requestId);
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
		const full = await this.workerQueueFull();
		if (full) return full;

		const requestId = await this.create(payload);
		try {
			if (!(await this.send(requestId, payload.kind))) {
				return (await this.claimHere(requestId))
					? { outcome: 'local' }
					: this.lost(requestId, payload.kind);
			}

			const sentAt = Date.now();
			let ownerCheckedAt = Date.now();
			while (!abortSignal.aborted) {
				await sleep(AgentRemoteTurnService.POLL_INTERVAL_MS);
				if (abortSignal.aborted) break;
				const state = await this.requests.findState(requestId);
				if (!state) return this.lost(requestId, payload.kind);
				if (state.result) return { outcome: 'done', result: state.result };
				if (state.claimedBy === null) {
					if (await this.takeOverIfDue(requestId, sentAt)) return { outcome: 'local' };
					if (await this.giveUpIfOverdue(requestId, sentAt)) {
						return { outcome: 'busy', retryAfterSeconds: await this.placement.retryAfterSeconds() };
					}
					continue;
				}
				if (Date.now() - ownerCheckedAt < AgentRemoteTurnService.OWNER_CHECK_INTERVAL_MS) continue;
				ownerCheckedAt = Date.now();
				const alive = await this.cluster.activeInstanceKeys();
				// A failed registry read is not a sign of a lost worker.
				if (alive && !alive.has(state.claimedBy)) return this.lost(requestId, payload.kind);
			}
			return { outcome: 'left' };
		} finally {
			await this.removeQuietly(requestId);
		}
	}

	/**
	 * Send a turn that no caller waits for to a worker. Returns `false` when
	 * this process must run it in its own way: no worker is up, or the request
	 * could not be stored or sent. Never throws. When no worker claims the
	 * request in time, this process claims it and calls `fallback`. A process
	 * that stops before then leaves the job to the workers.
	 */
	async detached(
		payload: AgentTurnRequestPayload,
		fallback: () => Promise<void>,
	): Promise<boolean> {
		try {
			if (!(await this.placement.workersAvailable())) return false;
			const requestId = await this.create(payload);
			if (!(await this.send(requestId, payload.kind))) {
				await this.removeQuietly(requestId);
				return false;
			}
			void this.fallBackWhenUnclaimed(requestId, payload.kind, fallback);
			return true;
		} catch (error) {
			this.logger.warn('Failed to send an agent turn to a worker', { kind: payload.kind, error });
			return false;
		}
	}

	/** Wait until a worker claims the request, or this process may take it over. */
	private async fallBackWhenUnclaimed(
		requestId: string,
		kind: Kind,
		fallback: () => Promise<void>,
	): Promise<void> {
		const sentAt = Date.now();
		await sleep(AgentTurnPlacement.FALLBACK_WAIT_MS, undefined, { ref: false });
		try {
			// Check the claim first, so that a turn a worker took is not counted as a fallback.
			while (await this.requests.isPending(requestId)) {
				if (await this.placement.mayFallBack(sentAt, 'request')) break;
				await sleep(AgentRemoteTurnService.DETACHED_RECHECK_MS, undefined, { ref: false });
			}
			if (!(await this.claimHere(requestId))) return;
			await this.removeQuietly(requestId);
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

		const abort = new AbortController();
		const stopWatch = this.watchWanted(requestId, abort);
		// Only a stream turn has a main that listens. Its sender also sends heartbeats.
		const sender =
			this.handlers.modeOf(payload.kind) === 'stream'
				? this.streams.createSender(requestStreamKey(requestId))
				: undefined;
		// The main removes the row of a result turn once it reads the result.
		let resultStored = false;
		try {
			const end = await this.handlers.run(
				payload,
				{ turnId: requestId, abortSignal: abort.signal },
				(event) => sender?.send(event),
			);
			if (end.outcome === 'done' && end.result) {
				await this.requests.complete(requestId, end.result);
				resultStored = true;
			}
		} catch (error) {
			this.logger.warn('Failed to store the result of an agent turn request', {
				requestId,
				kind: payload.kind,
				error,
			});
		} finally {
			stopWatch();
			await sender?.close();
			// Without a stored result, a removed row tells the main that the turn is lost.
			if (!resultStored) await this.removeQuietly(requestId);
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
		const requestId = randomUUID();
		await this.requests.createPending(requestId, payload);
		return requestId;
	}

	private async send(requestId: string, kind: Kind): Promise<boolean> {
		try {
			await this.turnQueue.enqueueRequest(requestId, TURN_PRIORITY[requestTurnClass(kind)]);
			return true;
		} catch (error) {
			this.logger.warn('Failed to send an agent turn to a worker', { requestId, error });
			return false;
		}
	}

	private lost(requestId: string, kind: Kind): AgentRemoteResult {
		this.logger.warn('Lost the worker that runs an agent turn', { requestId, kind });
		return { outcome: 'lost' };
	}

	/** Claim an unclaimed request for this process once it may stop waiting for a worker. */
	private async takeOverIfDue(requestId: string, sentAt: number): Promise<boolean> {
		if (!(await this.placement.mayFallBack(sentAt, 'request'))) return false;
		return await this.claimHere(requestId);
	}

	/**
	 * Claim an unclaimed request so that no worker runs it, once it waited
	 * longer than `N8N_AGENTS_QUEUE_MAX_WAIT`. The caller then rejects the turn.
	 * A false result means the request may still run.
	 */
	private async giveUpIfOverdue(requestId: string, sentAt: number): Promise<boolean> {
		const maxWaitMs = this.agentsConfig.queueMaxWaitSeconds * 1_000;
		if (maxWaitMs <= 0 || Date.now() - sentAt < maxWaitMs) return false;
		if (!(await this.claimHere(requestId))) return false;
		this.gate.rejected('wait-too-long');
		return true;
	}

	private async removeQuietly(requestId: string): Promise<void> {
		await this.requests.remove(requestId).catch((error: unknown) => {
			this.logger.debug('Failed to remove an agent turn request', { requestId, error });
		});
	}

	private async claimHere(requestId: string): Promise<boolean> {
		const claimant = this.cluster.instanceKey ?? `main:${randomUUID()}`;
		return (await this.requests.claim(requestId, claimant)) !== null;
	}

	/**
	 * Remove the rows that a crashed process left behind. No caller waits for
	 * them. The leader runs this on a timer, see `AgentQueueLifecycle`.
	 */
	removeStaleRequests(): void {
		const cutoff = new Date(Date.now() - AgentRemoteTurnService.STALE_REQUEST_MS);
		this.requests.removeOlderThan(cutoff).catch((error: unknown) => {
			this.logger.debug('Failed to remove stale agent turn requests', { error });
		});
	}
}
