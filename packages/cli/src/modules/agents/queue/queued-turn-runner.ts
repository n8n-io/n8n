import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentClusterService } from '../agent-cluster.service';
import { AgentTurnRequestRepository } from '../repositories/agent-turn-request.repository';
import { AgentStreamChannel } from './agent-stream-channel.service';
import { AgentTurnGate, requestTurnClass, TURN_PRIORITY } from './agent-turn-gate.service';
import { AgentTurnHandlers } from './agent-turn-handlers.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { AgentTurnQueue } from './agent-turn-queue.service';
import {
	type AgentTurnEnd,
	type AgentTurnEntry,
	AgentTurnNotAdmittedError,
	type AgentTurnRunner,
	type AgentTurnStart,
	type AgentTurnSubscription,
} from './agent-turn-runner';

type Listener = (entry: AgentTurnEntry) => void;

/** The channel key of one queued turn. */
const turnKey = (turnId: string) => `turn:${turnId}`;

/**
 * A message from the worker that runs a turn to the main that waits for it.
 *
 * - `claimed`: the worker took the turn. No other process runs it.
 * - `heartbeat`: the turn still runs.
 * - `entries`: entries of the turn, in sequence order.
 */
type QueuedTurnMessage =
	| { type: 'claimed' }
	| { type: 'heartbeat' }
	| { type: 'entries'; entries: AgentTurnEntry[] };

/** A turn that this main waits for. */
interface WatchedTurn {
	listeners: Set<Listener>;
	/** Stops the read of the channel of the turn. */
	unlisten: Promise<() => Promise<void>>;
	/** Set while `start` waits for a worker to claim the turn. */
	waiting?: { claimed: () => void; reject: (error: AgentTurnNotAdmittedError) => void };
	/** Set once a worker claimed the turn. Ends the turn as `lost` when it fires. */
	lostTimer?: NodeJS.Timeout;
}

/**
 * Runs agent turns on agent workers. A main uses it when at least one agent
 * worker is up. The main never runs these turns itself.
 *
 * On the main, `start` stores the input of the turn in an `agent_turn_request`
 * row and sends a request job. It resolves when a worker claims the row. When
 * no worker claims the row within `N8N_AGENTS_QUEUE_MAX_WAIT`, the main claims
 * it, so that no worker runs it, and `start` rejects the turn.
 *
 * The worker sends the entries of the turn on a Redis channel of the turn,
 * with a heartbeat while the turn runs. A claimed turn that sends nothing for
 * `LOST_AFTER_MS` ends as `lost`. `cancel` sends a message on the control
 * channel, and the worker that runs the turn stops it.
 *
 * The main never reads the row to follow a turn.
 */
@Service()
export class QueuedTurnRunner implements AgentTurnRunner {
	/** How often a worker tells the main that a turn still runs. */
	static readonly HEARTBEAT_MS = 5_000;

	/** A claimed turn that sends nothing for this long ends as `lost`. */
	static readonly LOST_AFTER_MS = 30_000;

	/** How long a worker collects entries before it sends them in one message. */
	static readonly BATCH_WINDOW_MS = 50;

	/** Rows older than this are left over from a crash. */
	static readonly STALE_REQUEST_MS = 60 * 60 * 1_000;

	/** Turns that this main waits for, by turn ID. */
	private readonly watched = new Map<string, WatchedTurn>();

	/** Turns that run on this worker, by turn ID. */
	private readonly runningHere = new Map<string, AbortController>();

	/** Jobs that run on this worker now. */
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
	) {
		this.logger = this.logger.scoped('agents');
	}

	// ---------------------------------------------------------------- main

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
		if (this.watched.get(turnId)?.waiting) {
			throw new UnexpectedError('An agent turn with this ID already started', {
				extra: { turnId },
			});
		}
		if (!mustRun && (await this.placement.queueFull(true))) {
			throw new AgentTurnNotAdmittedError('queue-full', await this.placement.retryAfterSeconds());
		}

		// Read the channel before the job goes out, so that no message is missed.
		const turn = await this.watch(turnId);
		const claimed = new Promise<void>((resolve, reject) => {
			turn.waiting = { claimed: resolve, reject };
		});
		// The caller sees the rejection through `start`.
		claimed.catch(() => {});

		let maxWaitTimer: NodeJS.Timeout | undefined;
		try {
			try {
				await this.requests.createPending(turnId, payload);
				await this.turnQueue.enqueueRequest(turnId, TURN_PRIORITY[requestTurnClass(payload.kind)]);
			} catch (error) {
				this.logger.warn('Failed to send an agent turn to a worker', { turnId, error });
				await this.removeQuietly(turnId);
				throw new AgentTurnNotAdmittedError('queue-full', await this.placement.retryAfterSeconds());
			}

			const maxWaitMs = this.agentsConfig.queueMaxWaitSeconds * 1_000;
			if (!mustRun && maxWaitMs > 0) {
				maxWaitTimer = setTimeout(() => {
					this.giveUp(turnId, 'wait-too-long').catch((error: unknown) => {
						this.logger.warn('Failed to stop the wait for an agent worker', { turnId, error });
					});
				}, maxWaitMs);
				maxWaitTimer.unref();
			}
			await claimed;
		} finally {
			clearTimeout(maxWaitTimer);
			turn.waiting = undefined;
			// A turn that no caller follows needs no channel once a worker has it.
			if (turn.listeners.size === 0) await this.release(turnId);
		}
	}

	async cancel(turnId: string): Promise<void> {
		if (this.watched.get(turnId)?.waiting) {
			await this.giveUp(turnId, 'left');
			return;
		}
		try {
			await this.channel.cancel(turnId);
		} catch (error) {
			this.logger.warn('Failed to send the cancel of an agent turn', { turnId, error });
		}
	}

	/**
	 * Stop the wait for a worker. When this main claims the row first, no
	 * worker runs the turn, and `start` throws. Else a worker has the turn, and
	 * a cancel goes to it.
	 */
	private async giveUp(turnId: string, reason: 'wait-too-long' | 'left'): Promise<void> {
		const turn = this.watched.get(turnId);
		if (!turn?.waiting) return;
		const won = await this.claimHere(turnId);
		const waiting = turn.waiting;
		if (!waiting) return;
		if (won) {
			await this.removeQuietly(turnId);
			if (reason === 'wait-too-long') this.gate.rejected(reason);
			const retryAfterSeconds = reason === 'left' ? 0 : await this.placement.retryAfterSeconds();
			waiting.reject(new AgentTurnNotAdmittedError(reason, retryAfterSeconds));
			return;
		}
		this.onClaimed(turn, turnId);
		if (reason === 'left') await this.cancel(turnId);
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
		if (message.type !== 'entries') return;
		for (const entry of message.entries) {
			this.emit(turn, entry);
			if ('end' in entry) {
				void this.release(turnId);
				return;
			}
		}
	}

	/** Mark the turn as claimed, and restart the timer that detects a lost worker. */
	private onClaimed(turn: WatchedTurn, turnId: string): void {
		turn.waiting?.claimed();
		clearTimeout(turn.lostTimer);
		turn.lostTimer = setTimeout(() => this.onLost(turnId), QueuedTurnRunner.LOST_AFTER_MS);
		turn.lostTimer.unref();
	}

	private onLost(turnId: string): void {
		const turn = this.watched.get(turnId);
		if (!turn) return;
		this.logger.warn('Lost the worker that runs an agent turn', { turnId });
		// Sequence 0: the main does not know the sequence of the last entry.
		this.emit(turn, { sequence: 0, end: { outcome: 'lost' } });
		void this.release(turnId);
	}

	private emit(turn: WatchedTurn, entry: AgentTurnEntry): void {
		for (const listener of turn.listeners) {
			try {
				listener(entry);
			} catch {
				// A listener that fails must not stop the other listeners.
			}
		}
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

	private async claimHere(turnId: string): Promise<boolean> {
		const claimant = this.cluster.instanceKey ?? `main:${randomUUID()}`;
		try {
			return (await this.requests.claim(turnId, claimant)) !== null;
		} catch (error) {
			this.logger.warn('Failed to claim an agent turn request', { turnId, error });
			return false;
		}
	}

	/**
	 * Remove the rows that a crashed process left behind. No caller waits for
	 * them. The leader runs this on a timer, see `AgentQueueLifecycle`.
	 */
	removeStaleRequests(): void {
		const cutoff = new Date(Date.now() - QueuedTurnRunner.STALE_REQUEST_MS);
		this.requests.removeOlderThan(cutoff).catch((error: unknown) => {
			this.logger.debug('Failed to remove stale agent turn requests', { error });
		});
	}

	// -------------------------------------------------------------- worker

	/** Stop the turns of this worker when a main cancels them. A worker calls this once. */
	async startWorker(): Promise<void> {
		await this.channel.onCancel((turnId) => this.runningHere.get(turnId)?.abort());
	}

	/** Run a request job on this worker. */
	async runJob(turnId: string): Promise<void> {
		const run = this.runClaimed(turnId).finally(() => this.running.delete(run));
		this.running.add(run);
		await run;
	}

	/** Number of jobs that run on this worker now. */
	get runningCount(): number {
		return this.running.size;
	}

	/** Resolves when every job that runs on this worker now has ended. */
	async whenIdle(): Promise<void> {
		await Promise.allSettled([...this.running]);
	}

	private async runClaimed(turnId: string): Promise<void> {
		const claimant = this.cluster.instanceKey;
		if (!claimant) return;
		const payload = await this.requests.claim(turnId, claimant);
		// The main gave up on the turn, or another worker has it.
		if (!payload) return;

		const abort = new AbortController();
		this.runningHere.set(turnId, abort);
		const out = new TurnMessageSender(this.channel, turnKey(turnId), this.logger);
		out.send({ type: 'claimed' });
		const heartbeat = setInterval(() => out.heartbeat(), QueuedTurnRunner.HEARTBEAT_MS);
		heartbeat.unref();
		let sequence = 0;
		try {
			const end: AgentTurnEnd = await this.handlers.run(
				payload,
				{ turnId, abortSignal: abort.signal },
				(event: AgentSseEvent) => out.entry({ sequence: ++sequence, event }),
			);
			out.entry({
				sequence: ++sequence,
				end: abort.signal.aborted ? { outcome: 'cancelled' } : end,
			});
		} finally {
			clearInterval(heartbeat);
			this.runningHere.delete(turnId);
			await out.flush();
			await this.removeQuietly(turnId);
		}
	}

	private async removeQuietly(turnId: string): Promise<void> {
		await this.requests.remove(turnId).catch((error: unknown) => {
			this.logger.debug('Failed to remove an agent turn request', { turnId, error });
		});
	}
}

/**
 * Sends the messages of one turn in order. Entries that come within
 * `BATCH_WINDOW_MS` go in one message, so that a fast stream of text does not
 * become one Redis message per token.
 */
class TurnMessageSender {
	private pending: AgentTurnEntry[] = [];

	private batchTimer?: NodeJS.Timeout;

	/** Publishes run one after the other, so messages keep their order. */
	private chain: Promise<void> = Promise.resolve();

	constructor(
		private readonly channel: AgentStreamChannel,
		private readonly key: string,
		private readonly logger: Logger,
	) {}

	send(message: QueuedTurnMessage): void {
		const body = JSON.stringify(message);
		this.chain = this.chain.then(async () => {
			try {
				await this.channel.publishTo(this.key, body);
			} catch (error) {
				// The main detects the gap through its lost-worker timer.
				this.logger.warn('Failed to send an agent turn message', { key: this.key, error });
			}
		});
	}

	entry(entry: AgentTurnEntry): void {
		this.pending.push(entry);
		if ('end' in entry) {
			this.sendPending();
			return;
		}
		this.batchTimer ??= setTimeout(() => this.sendPending(), QueuedTurnRunner.BATCH_WINDOW_MS);
	}

	/** Entries also show that the turn runs, so a heartbeat is needed only without them. */
	heartbeat(): void {
		if (this.pending.length === 0) this.send({ type: 'heartbeat' });
	}

	async flush(): Promise<void> {
		this.sendPending();
		await this.chain;
	}

	private sendPending(): void {
		clearTimeout(this.batchTimer);
		this.batchTimer = undefined;
		if (this.pending.length === 0) return;
		const entries = this.pending;
		this.pending = [];
		this.send({ type: 'entries', entries });
	}
}
