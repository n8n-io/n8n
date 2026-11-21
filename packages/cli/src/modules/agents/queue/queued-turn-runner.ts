import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentClusterService } from '../agent-cluster.service';
import { AgentTurnRequestRepository } from '../repositories/agent-turn-request.repository';
import { AgentQueueMetrics } from './agent-queue-metrics';
import { AgentStreamChannel } from './agent-stream-channel.service';
import { AgentTurnGate, requestTurnClass, TURN_PRIORITY } from './agent-turn-gate.service';
import { AgentTurnHandlers } from './agent-turn-handlers.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { AgentTurnQueue } from './agent-turn-queue.service';
import {
	type AgentTurnRequestPayload,
	isDurableTurnKind,
	isPublicTurn,
} from './agent-turn-request.types';
import {
	AgentTurnDuplicateError,
	type AgentTurnEntry,
	AgentTurnNotAdmittedError,
	type AgentTurnRunner,
	type AgentTurnStart,
	type AgentTurnSubscription,
} from './agent-turn-runner';
import { type QueuedTurnMessage, QueuedTurnWorker, turnKey } from './queued-turn-worker';
import { fanOut, runNumbered, type TurnListener as Listener } from './turn-fan-out';

/**
 * Why this main tries to claim a turn that no worker took yet:
 * - `wait-too-long`: the turn waited `N8N_AGENTS_QUEUE_MAX_WAIT`. The main rejects it.
 * - `left`: the caller left. The main drops the turn.
 * - `fall-back`: `AgentTurnPlacement.mayFallBack` lets this main run the turn.
 * - `must-run`: a turn that must run waited `MAX_UNCLAIMED_MS`. The main runs it.
 */
type ClaimIntent = 'wait-too-long' | 'left' | 'fall-back' | 'must-run';

/** A turn for which `start` waits until a process claims it. */
interface WaitingTurn {
	payload: AgentTurnRequestPayload;
	mustRun: boolean;
	/** When the request job went out, in epoch milliseconds. */
	sentAt: number;
	/**
	 * - `pending`: no process claimed the turn yet.
	 * - `worker`: a worker has the turn.
	 * - `here`: this main claimed the turn and runs it.
	 * - `rejected`: this main claimed the turn, so that no process runs it.
	 */
	state: 'pending' | 'worker' | 'here' | 'rejected';
	/** The caller left. The turn must not run, or must stop. */
	left: boolean;
	claimed: () => void;
	reject: (error: AgentTurnNotAdmittedError) => void;
	/** Set while this main tries to claim the turn. Other attempts wait for it. */
	attempt?: Promise<void>;
	/** Set after a failed claim, until the next attempt. */
	retryTimer?: NodeJS.Timeout;
}

/** A turn that this main waits for. */
interface WatchedTurn {
	listeners: Set<Listener>;
	/** Stops the read of the channel of the turn. */
	unlisten: Promise<() => Promise<void>>;
	/** Set while `start` waits for a process to claim the turn. */
	waiting?: WaitingTurn;
	/** Set once a worker claimed the turn. Ends the turn as `lost` when it fires. */
	lostTimer?: NodeJS.Timeout;
	/** Sequence of the last entry that this main received. */
	sequence: number;
}

/**
 * Runs agent turns on agent workers. A main uses it when at least one agent
 * worker is up. A webhook process in agent queue mode uses it for every turn.
 * The worker side is `QueuedTurnWorker`.
 *
 * The same rules apply on a webhook process, except that it never runs a
 * turn itself: a turn that it would take over ends rejected. The same holds
 * for public turns (`PUBLIC_TURN_KINDS`) on every process.
 *
 * On the main, `start` stores the input of the turn in an `agent_turn_request`
 * row and sends a request job. It resolves when a process claims the row.
 * When no worker claims the row within `N8N_AGENTS_QUEUE_MAX_WAIT`, the main
 * claims it, so that no worker runs it, and `start` rejects the turn.
 *
 * A turn with no wait limit (a turn that must run, or any turn when
 * `N8N_AGENTS_QUEUE_MAX_WAIT` is 0) has no such deadline. Its request job can
 * get lost, so the main checks it each `AgentTurnPlacement.FALLBACK_WAIT_MS`:
 * - when `mayFallBack` allows it, the main claims the turn and runs it here,
 * - after `MAX_UNCLAIMED_MS`, the main claims the turn. It runs a turn that
 *   must run, and rejects the other turns.
 *
 * A durable turn (`DURABLE_TURN_KINDS`) has no wait limit and no caller that
 * waits for it. `start` resolves once its row and request job are stored, and
 * the row waits until a worker claims it. No main claims it to reject or run
 * it. The leader sends its request job again after `DURABLE_REQUEUE_AFTER_MS`,
 * and removes the row after `DURABLE_REQUEST_MS`.
 *
 * The worker sends the entries of the turn on a Redis channel of the turn,
 * with a heartbeat while the turn runs. A claimed turn that sends nothing for
 * `LOST_AFTER_MS`, or whose entries have a gap in their sequence numbers,
 * ends as `lost`. `cancel` sends a message on the control channel, and the
 * worker that runs the turn stops it.
 */
@Service()
export class QueuedTurnRunner implements AgentTurnRunner {
	/** A claimed turn that sends nothing for this long ends as `lost`. */
	static readonly LOST_AFTER_MS = 30_000;

	/** Rows older than this are left over from a crash. */
	static readonly STALE_REQUEST_MS = 60 * 60 * 1_000;

	/**
	 * A turn with no wait limit that no worker claimed for this long has lost
	 * its request job. Shorter than `STALE_REQUEST_MS`, so the row still exists.
	 */
	static readonly MAX_UNCLAIMED_MS = 30 * 60 * 1_000;

	/**
	 * An unclaimed durable request waits this long for a worker. The leader
	 * then removes it, logs a warning and counts it as expired.
	 */
	static readonly DURABLE_REQUEST_MS = 24 * 60 * 60 * 1_000;

	/**
	 * The leader sends the request job of an unclaimed durable request again
	 * after this time, because the job can be lost. A job that still waits has
	 * the same job ID, so the queue ignores the copy.
	 */
	static readonly DURABLE_REQUEUE_AFTER_MS = 10 * 60 * 1_000;

	/** Most durable requests that the leader sends again in one sweep. */
	static readonly DURABLE_REQUEUE_BATCH = 500;

	/** How long to wait before the main tries again a claim that failed. */
	static readonly CLAIM_RETRY_MS = 5_000;

	/**
	 * Extra time after `N8N_AGENTS_QUEUE_MAX_WAIT` before an unclaimed row no
	 * longer counts against the cap of its agent. The process that waits for the
	 * row claims it at the deadline. A row older than that was left by a crash.
	 */
	static readonly AGENT_WAITING_MARGIN_MS = 60_000;

	/** Turns that this main waits for, by turn ID. */
	private readonly watched = new Map<string, WatchedTurn>();

	/** Turns that this main took over and runs itself, by turn ID. */
	private readonly runningHere = new Map<string, AbortController>();

	/** Turns that this main took over and that run now. */
	private readonly running = new Set<Promise<void>>();

	constructor(
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly cluster: AgentClusterService,
		private readonly placement: AgentTurnPlacement,
		private readonly gate: AgentTurnGate,
		private readonly turnQueue: AgentTurnQueue,
		private readonly requests: AgentTurnRequestRepository,
		private readonly channel: AgentStreamChannel,
		private readonly handlers: AgentTurnHandlers,
		private readonly worker: QueuedTurnWorker,
		private readonly metrics: AgentQueueMetrics,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async subscribe(turnId: string, listener: Listener): Promise<AgentTurnSubscription> {
		const turn = await this.watch(turnId);
		turn.listeners.add(listener);
		return {
			close: () => {
				turn.listeners.delete(listener);
				if (turn.listeners.size === 0 && !turn.waiting) void this.release(turnId);
			},
		};
	}

	async start({ turnId, payload, mustRun = false }: AgentTurnStart): Promise<void> {
		if (this.watched.get(turnId)?.waiting) throw new AgentTurnDuplicateError(turnId);
		if (!mustRun && (await this.placement.queueFull(true))) {
			throw new AgentTurnNotAdmittedError('queue-full', await this.placement.retryAfterSeconds());
		}
		if (!mustRun && isPublicTurn(payload) && (await this.agentQueueFull(payload.agentId))) {
			this.gate.rejected('agent-queue-full');
			throw new AgentTurnNotAdmittedError(
				'agent-queue-full',
				await this.placement.retryAfterSeconds(),
			);
		}

		if (isDurableTurnKind(payload.kind)) {
			if (!(await this.send(turnId, payload))) throw new AgentTurnDuplicateError(turnId);
			return;
		}

		// Read the channel before the job goes out, so that no message is missed.
		const turn = await this.watch(turnId);
		let waiting!: WaitingTurn;
		const claimed = new Promise<void>((resolve, reject) => {
			waiting = {
				payload,
				mustRun,
				sentAt: Date.now(),
				state: 'pending',
				left: false,
				claimed: resolve,
				reject,
			};
		});
		turn.waiting = waiting;
		// The caller sees the rejection through `start`.
		claimed.catch(() => {});

		let maxWaitTimer: NodeJS.Timeout | undefined;
		let fallbackTimer: NodeJS.Timeout | undefined;
		try {
			if (!(await this.send(turnId, payload))) throw new AgentTurnDuplicateError(turnId);
			waiting.sentAt = Date.now();

			const maxWaitMs = this.agentsConfig.queueMaxWaitSeconds * 1_000;
			if (!mustRun && maxWaitMs > 0) {
				maxWaitTimer = setTimeout(() => this.settleQuietly(turnId, 'wait-too-long'), maxWaitMs);
				maxWaitTimer.unref();
			} else {
				fallbackTimer = setInterval(
					() => this.checkUnclaimed(turnId),
					AgentTurnPlacement.FALLBACK_WAIT_MS,
				);
				fallbackTimer.unref();
			}
			await claimed;
		} finally {
			clearTimeout(maxWaitTimer);
			clearInterval(fallbackTimer);
			clearTimeout(waiting.retryTimer);
			turn.waiting = undefined;
			// A turn that no caller follows needs no channel once a process has it.
			if (turn.listeners.size === 0) await this.release(turnId);
		}
	}

	/**
	 * Store the row of a turn and send its request job. Returns `false` when
	 * the row exists already. Throws not admitted when the database or Redis
	 * failed, and then removes the row.
	 */
	private async send(turnId: string, payload: AgentTurnRequestPayload): Promise<boolean> {
		try {
			// A caller can derive the ID from a platform delivery. A retry of a
			// turn that waits or runs finds the row and stops here.
			const created = await this.requests.createPendingIfAbsent(turnId, payload);
			if (created) {
				await this.turnQueue.enqueueRequest(turnId, TURN_PRIORITY[requestTurnClass(payload.kind)]);
			}
			return created;
		} catch (error) {
			this.logger.warn('Failed to send an agent turn to a worker', { turnId, error });
			await this.removeQuietly(turnId);
			this.gate.rejected('queue-unavailable');
			throw new AgentTurnNotAdmittedError(
				'queue-unavailable',
				await this.placement.retryAfterSeconds(),
			);
		}
	}

	async cancel(turnId: string): Promise<void> {
		const waiting = this.watched.get(turnId)?.waiting;
		if (waiting?.state === 'pending') {
			waiting.left = true;
			await this.settle(turnId, 'left');
			return;
		}
		await this.stop(turnId);
	}

	/** Stop a turn that a process already runs. */
	private async stop(turnId: string): Promise<void> {
		const here = this.runningHere.get(turnId);
		if (here) {
			here.abort();
			return;
		}
		try {
			await this.channel.cancel(turnId);
		} catch (error) {
			this.logger.warn('Failed to send the cancel of an agent turn', { turnId, error });
		}
	}

	/**
	 * Whether `N8N_AGENTS_QUEUE_MAX_WAITING_PER_AGENT` public turns of this
	 * agent already wait for a worker. The count reads the shared table, so it
	 * holds across processes. Two processes that check at the same time can
	 * each admit one turn over the cap. Admits the turn when the count fails:
	 * the insert of the row fails too when the database is down. A durable
	 * turn waits up to `DURABLE_REQUEST_MS`, so it counts for that long.
	 */
	private async agentQueueFull(agentId: string): Promise<boolean> {
		const limit = this.agentsConfig.queueMaxWaitingPerAgent;
		if (limit <= 0) return false;
		const maxWaitMs = this.agentsConfig.queueMaxWaitSeconds * 1_000;
		const windowMs =
			maxWaitMs > 0
				? maxWaitMs + QueuedTurnRunner.AGENT_WAITING_MARGIN_MS
				: QueuedTurnRunner.MAX_UNCLAIMED_MS;
		try {
			const now = Date.now();
			const count = await this.requests.countPendingForAgent(agentId, {
				since: new Date(now - windowMs),
				durableSince: new Date(now - QueuedTurnRunner.DURABLE_REQUEST_MS),
			});
			return count >= limit;
		} catch (error) {
			this.logger.warn('Failed to count the waiting turns of an agent', { agentId, error });
			return false;
		}
	}

	/** Check a turn with no wait limit that no worker claimed yet. */
	private checkUnclaimed(turnId: string): void {
		const waiting = this.watched.get(turnId)?.waiting;
		if (waiting?.state !== 'pending' || waiting.attempt) return;
		const mayRunHere = this.placement.mayRunHere(waiting.payload.kind);
		if (Date.now() - waiting.sentAt >= QueuedTurnRunner.MAX_UNCLAIMED_MS) {
			this.logger.warn('No agent worker claimed an agent turn in time', {
				turnId,
				mustRun: waiting.mustRun,
			});
			this.settleQuietly(turnId, waiting.mustRun && mayRunHere ? 'must-run' : 'wait-too-long');
			return;
		}
		// A public turn, or any turn on a webhook process, runs only on an agent worker.
		if (!mayRunHere) return;
		this.placement
			.mayFallBack(waiting.sentAt, 'request', waiting.payload.kind)
			.then((mayFallBack) => {
				if (mayFallBack) this.settleQuietly(turnId, 'fall-back');
			})
			.catch((error: unknown) => {
				this.logger.warn('Failed to check an agent turn fallback', { turnId, error });
			});
	}

	private settleQuietly(turnId: string, intent: ClaimIntent): void {
		this.settle(turnId, intent).catch((error: unknown) => {
			this.logger.warn('Failed to settle the wait for an agent worker', { turnId, intent, error });
		});
	}

	/**
	 * Try to claim a turn that no process claimed yet. Only one attempt runs at
	 * a time. A later call waits for the attempt that runs.
	 */
	private async settle(turnId: string, intent: ClaimIntent): Promise<void> {
		const turn = this.watched.get(turnId);
		const waiting = turn?.waiting;
		if (!turn || waiting?.state !== 'pending') return;
		clearTimeout(waiting.retryTimer);
		waiting.attempt ??= this.attemptClaim(turn, turnId, waiting, intent).finally(() => {
			waiting.attempt = undefined;
		});
		await waiting.attempt;
	}

	private async attemptClaim(
		turn: WatchedTurn,
		turnId: string,
		waiting: WaitingTurn,
		intent: ClaimIntent,
	): Promise<void> {
		let won: boolean;
		try {
			won = await this.claimHere(turnId);
		} catch (error) {
			// The claim failed, so it is not known whether a worker has the turn. Try again later.
			this.logger.warn('Failed to claim an agent turn request', { turnId, error });
			if (intent === 'wait-too-long' || waiting.left) {
				waiting.retryTimer = setTimeout(
					() => this.settleQuietly(turnId, intent),
					QueuedTurnRunner.CLAIM_RETRY_MS,
				);
				waiting.retryTimer.unref();
			}
			return;
		}
		if (!won) {
			// A worker claimed the turn first.
			this.onClaimed(turn, turnId);
			return;
		}

		await this.turnQueue.removeRequest(turnId);
		const mayRunHere = this.placement.mayRunHere(waiting.payload.kind);
		if (waiting.left || intent === 'wait-too-long' || !mayRunHere) {
			waiting.state = 'rejected';
			await this.removeQuietly(turnId);
			const reason = waiting.left ? 'left' : 'wait-too-long';
			if (reason === 'wait-too-long') this.gate.rejected(reason);
			const retryAfterSeconds = reason === 'left' ? 0 : await this.placement.retryAfterSeconds();
			waiting.reject(new AgentTurnNotAdmittedError(reason, retryAfterSeconds));
			return;
		}
		this.runHere(turnId, waiting, intent === 'must-run');
	}

	/** Run a turn that this main claimed. The entries go to the listeners of this main. */
	private runHere(turnId: string, waiting: WaitingTurn, forced: boolean): void {
		waiting.state = 'here';
		// `mayFallBack` records its own fallbacks.
		if (forced) this.metrics.record({ type: 'fallback', path: 'request' });
		const abort = new AbortController();
		this.runningHere.set(turnId, abort);
		waiting.claimed();
		const run = this.runLocal(turnId, waiting.payload, abort.signal, forced).finally(() => {
			this.runningHere.delete(turnId);
			this.running.delete(run);
		});
		this.running.add(run);
	}

	private async runLocal(
		turnId: string,
		payload: AgentTurnRequestPayload,
		abortSignal: AbortSignal,
		forced: boolean,
	): Promise<void> {
		try {
			// `mayFallBack` already took room in the gate. A forced turn waits for room here.
			if (forced && this.cluster.isMain) {
				const admission = await this.gate.waitForRoom(requestTurnClass(payload.kind), {
					abortSignal,
					untilRoom: true,
				});
				if (!admission.admitted) {
					this.deliver(turnId, { sequence: 1, end: { outcome: 'cancelled' } });
					return;
				}
			}
			await runNumbered(this.handlers, payload, { turnId, abortSignal }, (entry) =>
				this.deliver(turnId, entry),
			);
		} finally {
			await this.removeQuietly(turnId);
		}
	}

	/** Give an entry of a turn that runs here to the listeners of the turn. */
	private deliver(turnId: string, entry: AgentTurnEntry): void {
		const turn = this.watched.get(turnId);
		if (!turn) return;
		turn.sequence = entry.sequence;
		fanOut(turn.listeners, entry);
		if ('end' in entry) void this.release(turnId);
	}

	/** Read the channel of a turn once, however many callers follow it. */
	private async watch(turnId: string): Promise<WatchedTurn> {
		const existing = this.watched.get(turnId);
		if (existing) {
			await existing.unlisten;
			return existing;
		}
		const turn: WatchedTurn = {
			listeners: new Set(),
			unlisten: this.channel.listen(turnKey(turnId), (message) => this.onMessage(turnId, message)),
			sequence: 0,
		};
		this.watched.set(turnId, turn);
		try {
			await turn.unlisten;
		} catch (error) {
			this.watched.delete(turnId);
			throw error;
		}
		return turn;
	}

	private onMessage(turnId: string, raw: string): void {
		const turn = this.watched.get(turnId);
		if (!turn) return;
		const message = jsonParse<QueuedTurnMessage | null>(raw, { fallbackValue: null });
		if (!message) return;
		this.onClaimed(turn, turnId);
		// Pub/sub can drop a message. A gap in the sequence numbers shows it.
		if (message.type === 'heartbeat') {
			if (message.sequence > turn.sequence) this.endAsLost(turnId, 'gap');
			return;
		}
		if (message.type !== 'entries') return;
		for (const entry of message.entries) {
			if (entry.sequence !== turn.sequence + 1) {
				this.endAsLost(turnId, 'gap');
				return;
			}
			turn.sequence = entry.sequence;
			fanOut(turn.listeners, entry);
			if ('end' in entry) {
				void this.release(turnId);
				return;
			}
		}
	}

	/** Mark the turn as claimed by a worker, and restart the timer that detects a lost worker. */
	private onClaimed(turn: WatchedTurn, turnId: string): void {
		const waiting = turn.waiting;
		if (waiting?.state === 'pending') {
			waiting.state = 'worker';
			waiting.claimed();
			// The caller left while the turn waited. Stop the worker.
			if (waiting.left) void this.stop(turnId);
		}
		clearTimeout(turn.lostTimer);
		turn.lostTimer = setTimeout(
			() => this.endAsLost(turnId, 'silent'),
			QueuedTurnRunner.LOST_AFTER_MS,
		);
		turn.lostTimer.unref();
	}

	private endAsLost(turnId: string, cause: 'silent' | 'gap'): void {
		const turn = this.watched.get(turnId);
		if (!turn) return;
		this.logger.warn('Lost the worker that runs an agent turn', { turnId, cause });
		fanOut(turn.listeners, { sequence: turn.sequence + 1, end: { outcome: 'lost' } });
		void this.release(turnId);
	}

	private async release(turnId: string): Promise<void> {
		const turn = this.watched.get(turnId);
		if (!turn) return;
		this.watched.delete(turnId);
		clearTimeout(turn.lostTimer);
		try {
			await (await turn.unlisten)();
		} catch (error) {
			this.logger.debug('Failed to stop reading an agent turn channel', { turnId, error });
		}
	}

	/** Claim the row of a turn for this main. Throws when the database cannot answer. */
	private async claimHere(turnId: string): Promise<boolean> {
		const claimant = this.cluster.instanceKey ?? `main:${randomUUID()}`;
		return (await this.requests.claim(turnId, claimant)) !== null;
	}

	/**
	 * Remove the rows that a crashed process left behind. No caller waits for
	 * them. An unclaimed durable row stays for `DURABLE_REQUEST_MS`, and its
	 * request job goes out again, see `requeueDurableRequests`. The leader runs
	 * this on a timer, see `AgentQueueLifecycle`. Never rejects.
	 */
	async removeStaleRequests(): Promise<void> {
		const now = Date.now();
		try {
			const { expiredDurable } = await this.requests.removeStale({
				cutoff: new Date(now - QueuedTurnRunner.STALE_REQUEST_MS),
				durableCutoff: new Date(now - QueuedTurnRunner.DURABLE_REQUEST_MS),
			});
			if (expiredDurable > 0) {
				this.logger.warn('Removed chat platform events that no agent worker took in time', {
					count: expiredDurable,
					maxAgeMs: QueuedTurnRunner.DURABLE_REQUEST_MS,
				});
				this.metrics.record({ type: 'turns-expired', count: expiredDurable });
			}
		} catch (error) {
			this.logger.debug('Failed to remove stale agent turn requests', { error });
		}
		await this.requeueDurableRequests();
	}

	/**
	 * Send the request job of each durable row that no worker claimed after
	 * `DURABLE_REQUEUE_AFTER_MS` again. A job that a worker paused for
	 * shutdown, or that Redis lost, is then not lost for good. The claim of the
	 * row stops a second run. Never rejects.
	 */
	private async requeueDurableRequests(): Promise<void> {
		if (!this.turnQueue.isReady) return;
		try {
			const rows = await this.requests.findUnclaimedDurable(
				new Date(Date.now() - QueuedTurnRunner.DURABLE_REQUEUE_AFTER_MS),
				QueuedTurnRunner.DURABLE_REQUEUE_BATCH,
			);
			for (const { id, kind } of rows) {
				await this.turnQueue.enqueueRequest(id, TURN_PRIORITY[requestTurnClass(kind)]);
			}
		} catch (error) {
			this.logger.warn('Failed to send the jobs of waiting agent turns again', { error });
		}
	}

	/** Number of request turns that run in this process now: taken over here, or as worker jobs. */
	get runningCount(): number {
		return this.running.size + this.worker.runningCount;
	}

	/**
	 * Number of turns that a caller of this process waits for or follows now,
	 * wherever the turn runs. A webhook process holds the request of a public
	 * caller while a worker runs the turn, so shutdown must wait for these too.
	 */
	get followedCount(): number {
		let count = 0;
		for (const turn of this.watched.values()) {
			if (turn.waiting || turn.listeners.size > 0) count++;
		}
		return count;
	}

	/** Resolves when every request turn that runs in this process now has ended. */
	async whenIdle(): Promise<void> {
		await Promise.allSettled([...this.running, this.worker.whenIdle()]);
	}

	private async removeQuietly(turnId: string): Promise<void> {
		await this.requests.remove(turnId).catch((error: unknown) => {
			this.logger.debug('Failed to remove an agent turn request', { turnId, error });
		});
	}
}
