import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AgentMainMemory } from './agent-main-memory.service';
import {
	AgentQueueMetrics,
	type AgentStreamSkipReason,
	type AgentTurnHoldReason,
	type AgentTurnRejectReason,
} from './agent-queue-metrics';
import type { AgentTurnRequestPayload } from './agent-turn-request.types';

/**
 * How urgent an agent turn is. The class sets the order in which waiting
 * turns start, and how long a turn may wait before n8n rejects it.
 *
 * - `nested`: a turn that runs inside another turn, such as a Message an
 *   Agent node in a workflow tool. Its parent already holds a place, so it
 *   never waits. Waiting could deadlock the parent.
 * - `resume`: the continuation of a turn that already started, such as a
 *   tool approval or a wake. Starts first.
 * - `chat`: a person waits in a chat.
 * - `channel`: a program waits, such as a Responses API call or a chat
 *   platform message.
 * - `background`: nobody waits, such as a scheduled task or a workflow run.
 */
export type AgentTurnClass = 'nested' | 'resume' | 'chat' | 'channel' | 'background';

/** Lower runs first. Also used as the Bull job priority, where 1 is the highest. */
export const TURN_PRIORITY: Record<AgentTurnClass, number> = {
	nested: 1,
	resume: 1,
	chat: 2,
	channel: 3,
	background: 4,
};

/** The class of a turn that a request row carries. */
export function requestTurnClass(kind: AgentTurnRequestPayload['kind']): AgentTurnClass {
	switch (kind) {
		case 'chat-resume':
		case 'app-resume':
		case 'workflow-tool-resume':
		case 'wake':
			return 'resume';
		case 'app-chat':
			return 'chat';
		case 'webhook-respond':
		case 'webhook-decide':
			return 'channel';
		case 'task-run':
			return 'background';
	}
}

/**
 * The answer of the gate to a turn. A rejected turn carries why, and when the
 * caller can try again.
 */
export type AgentTurnAdmission =
	| { admitted: true }
	| { admitted: false; reason: AgentTurnRejectReason | 'left'; retryAfterSeconds: number };

export interface AgentTurnWaitOptions {
	/** Aborts when the caller leaves. The turn then gives up its place. */
	abortSignal?: AbortSignal;
	/**
	 * Wait until room comes free, with no time limit and no waiting limit. For
	 * work that already started and that has no caller to tell, such as the
	 * resume of a workflow tool. Rejecting it would lose the work.
	 */
	untilRoom?: boolean;
}

interface Waiter {
	priority: number;
	enqueuedAt: number;
	deadline: number;
	finish: (granted: boolean, reason?: AgentTurnRejectReason) => void;
}

/** Wrap `fn` so that only its first call runs. */
function once(fn: () => void): () => void {
	let called = false;
	return () => {
		if (called) return;
		called = true;
		fn();
	};
}

/**
 * Decides whether this process has room for one more agent turn. Every main
 * uses it, in regular mode and in queue mode. Where the turn then runs is the
 * job of `AgentTurnPlacement`.
 *
 * The gate holds four limits of this process:
 * - running agent turns, `N8N_AGENTS_MAIN_MAX_TURNS`,
 * - memory use, `N8N_AGENTS_MAIN_MEMORY_HOLD_LEVEL`,
 * - chat messages that are accepted at the same time, `N8N_AGENTS_MAIN_MAX_INTAKE`,
 * - live chat streams, `N8N_AGENTS_MAIN_MAX_STREAMS`.
 *
 * A turn over a limit waits in priority order, for at most the wait of its
 * class. n8n then rejects it with a busy error and a `Retry-After` time.
 * The limits are per process. With more than one main, each main has its
 * own room. Turns that wait for an agent worker are counted in the shared
 * agent queue instead, see `AgentTurnPlacement.queueFull`.
 */
@Service()
export class AgentTurnGate {
	/**
	 * A turn that this process took counts toward its limits for this long, even
	 * before it shows as a running turn. Many checks run at once after a scan,
	 * so without this they would all see the same free room.
	 */
	static readonly CLAIM_START_MS = 5_000;

	/**
	 * How long a held queued message keeps its place ahead of newer messages.
	 * Longer than a queue scan, so that each scan renews the messages that still wait.
	 */
	static readonly HELD_TTL_MS = 12_000;

	/** How long a chat message waits for a free intake place before n8n rejects it. */
	static readonly INTAKE_WAIT_MS = 10_000;

	/** How often waiting turns check for room. A check reads two counters, so it is cheap. */
	static readonly RECHECK_MS = 250;

	/** How long a background turn waits for room before n8n gives up on it. */
	static readonly BACKGROUND_MAX_WAIT_MS = 5 * 60_000;

	/** Bounds of the `Retry-After` time that n8n sends with a busy rejection. */
	static readonly MIN_RETRY_AFTER_SECONDS = 5;

	static readonly MAX_RETRY_AFTER_SECONDS = 120;

	private recentClaims: number[] = [];

	private intakeRunning = 0;

	private readonly intakeWaiters: Array<(granted: boolean) => void> = [];

	private liveStreams = 0;

	/** Queue time of each queued message that the gate held, with the time of the last check. */
	private readonly held = new Map<number, number>();

	private readonly waiters: Waiter[] = [];

	private pumpTimer?: NodeJS.Timeout;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly metrics: AgentQueueMetrics,
		private readonly memory: AgentMainMemory,
	) {}

	/**
	 * Wait for room for a turn that runs in this process, such as an app chat,
	 * a webhook channel request or a scheduled task. When the turn is admitted,
	 * it counts as taken. n8n rejects the turn when too many turns wait, when
	 * no room comes free within the wait of its class, or when the caller
	 * leaves. A `nested` turn never waits: its parent already holds a place.
	 */
	async waitForRoom(
		turnClass: AgentTurnClass,
		{ abortSignal, untilRoom = false }: AgentTurnWaitOptions = {},
	): Promise<AgentTurnAdmission> {
		const now = Date.now();
		if (turnClass === 'nested') {
			this.recentClaims.push(now);
			return { admitted: true };
		}
		if (this.waiters.length === 0 && this.admit(now)) return { admitted: true };
		if (abortSignal?.aborted) return this.refusal('left');
		const limit = this.agentsConfig.queueMaxWaiting;
		if (!untilRoom && limit > 0 && this.waiting() >= limit) {
			this.rejected('queue-full');
			return this.refusal('queue-full');
		}

		return await new Promise<AgentTurnAdmission>((resolve) => {
			const waiter: Waiter = {
				priority: TURN_PRIORITY[turnClass],
				enqueuedAt: now,
				deadline: untilRoom ? Number.POSITIVE_INFINITY : now + this.maxWaitMs(turnClass),
				finish: (granted, reason) => {
					abortSignal?.removeEventListener('abort', onAbort);
					const index = this.waiters.indexOf(waiter);
					if (index !== -1) this.waiters.splice(index, 1);
					if (granted) return resolve({ admitted: true });
					if (reason) this.rejected(reason);
					resolve(this.refusal(reason ?? 'left'));
				},
			};
			const onAbort = () => waiter.finish(false);
			abortSignal?.addEventListener('abort', onAbort, { once: true });
			this.waiters.push(waiter);
			this.waiters.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
			this.startPump();
		});
	}

	private refusal(reason: AgentTurnRejectReason | 'left'): AgentTurnAdmission {
		return { admitted: false, reason, retryAfterSeconds: this.retryAfterSeconds() };
	}

	/**
	 * Whether this process may start a queued message now. A true result counts
	 * as a taken turn, so call it only right before a claim. See `claimSettled`.
	 *
	 * Queued messages wait in the durable message queue, not here. A held
	 * message keeps its place: a message queued at `queuedAt` also waits while
	 * an older held message waits. Turns that wait in `waitForRoom` go first,
	 * because their callers hold an open request and have a time limit.
	 */
	mayStartQueued(queuedAt: number): boolean {
		const now = Date.now();
		if (this.waiters.length > 0) return this.hold('main-at-limit', queuedAt);
		return this.admit(now, queuedAt);
	}

	/**
	 * Take room for a turn without waiting, such as a takeover from a worker.
	 * A true result counts as a taken turn.
	 */
	tryTake(): boolean {
		return this.waiters.length === 0 && this.admit(Date.now());
	}

	/**
	 * Tell that the claim after a true `mayStartQueued` ended. A claimed turn
	 * now shows as a running turn, so it must not count twice.
	 */
	claimSettled(): void {
		this.recentClaims.shift();
	}

	/** True while a queued message waits for room. The caller then checks the queue when a turn ends. */
	get hasHeldTurns(): boolean {
		this.dropStaleHolds(Date.now());
		return this.held.size > 0;
	}

	/** Turns that wait for room in this process. */
	waiting(): number {
		this.dropStaleHolds(Date.now());
		return this.held.size + this.waiters.length;
	}

	/** Running agent turns here, plus turns taken that may not run yet. */
	turnsHere(now = Date.now()): number {
		this.recentClaims = this.recentClaims.filter((at) => now - at < AgentTurnGate.CLAIM_START_MS);
		return this.metrics.localTurns() + this.recentClaims.length;
	}

	/**
	 * Open a live chat stream on this process. Returns the function that closes
	 * it, or `undefined` when memory is high or `N8N_AGENTS_MAIN_MAX_STREAMS`
	 * streams are open. The message is then still accepted, and the chat loads
	 * the reply from the recorded history.
	 */
	openStream(): (() => void) | undefined {
		if (this.memory.isHigh()) return this.skipStream('main-memory-high');
		const limit = this.agentsConfig.mainMaxStreams;
		if (limit > 0 && this.liveStreams >= limit) return this.skipStream('main-at-stream-limit');
		this.liveStreams++;
		return once(() => {
			this.liveStreams--;
		});
	}

	/**
	 * Take one of the `N8N_AGENTS_MAIN_MAX_INTAKE` places that accept chat
	 * messages. Accepting a message runs permission, agent and credential
	 * checks, so a burst of messages could use all of the CPU. When all places
	 * are taken, wait in order for up to `INTAKE_WAIT_MS`.
	 *
	 * Returns the function that frees the place, or `undefined` when no place
	 * was free in time or the request was aborted.
	 */
	async enterIntake(abortSignal: AbortSignal): Promise<(() => void) | undefined> {
		const limit = this.agentsConfig.mainMaxIntake;
		if (limit <= 0) return () => {};
		if (abortSignal.aborted) return undefined;
		if (this.intakeRunning < limit) {
			this.intakeRunning++;
			return this.intakeRelease();
		}

		const granted = await new Promise<boolean>((resolve) => {
			const finish = (ok: boolean) => {
				clearTimeout(timer);
				abortSignal.removeEventListener('abort', drop);
				resolve(ok);
			};
			const drop = () => {
				const index = this.intakeWaiters.indexOf(finish);
				if (index !== -1) this.intakeWaiters.splice(index, 1);
				finish(false);
			};
			const timer = setTimeout(drop, AgentTurnGate.INTAKE_WAIT_MS);
			abortSignal.addEventListener('abort', drop, { once: true });
			this.intakeWaiters.push(finish);
		});
		if (granted) return this.intakeRelease();
		if (!abortSignal.aborted) this.metrics.record({ type: 'intake-rejected' });
		return undefined;
	}

	/**
	 * The `Retry-After` time for a busy rejection. It grows with the share of
	 * the waiting limit in use, and has a random spread of 20%, so that
	 * rejected callers do not all come back at the same time.
	 */
	retryAfterSeconds(waiting = this.waiting(), limit = this.agentsConfig.queueMaxWaiting): number {
		const { MIN_RETRY_AFTER_SECONDS: min, MAX_RETRY_AFTER_SECONDS: max } = AgentTurnGate;
		const share = limit > 0 ? Math.min(1, waiting / limit) : 0;
		const base = min + share * (max - min);
		const spread = 1 + (Math.random() * 0.4 - 0.2);
		return Math.round(Math.min(max, Math.max(min, base * spread)));
	}

	/** Record a busy rejection. */
	rejected(reason: AgentTurnRejectReason): void {
		this.metrics.record({ type: 'turn-rejected', reason });
	}

	private maxWaitMs(turnClass: AgentTurnClass): number {
		if (turnClass === 'background') return AgentTurnGate.BACKGROUND_MAX_WAIT_MS;
		const seconds = this.agentsConfig.queueMaxWaitSeconds;
		return seconds > 0 ? seconds * 1_000 : Number.POSITIVE_INFINITY;
	}

	/** Start the waiting turns that fit, in priority order, and reject the overdue ones. */
	private pump(): void {
		const now = Date.now();
		for (const waiter of [...this.waiters]) {
			if (now >= waiter.deadline) {
				waiter.finish(false, this.memory.isHigh() ? 'main-memory-high' : 'wait-too-long');
			}
		}
		// No hold metric here: a waiting turn is checked four times each second.
		while (this.waiters.length > 0 && this.blockedBy(now) === undefined) {
			this.recentClaims.push(now);
			this.waiters[0].finish(true);
		}
		if (this.waiters.length === 0) this.stopPump();
	}

	private startPump(): void {
		if (this.pumpTimer) return;
		this.pumpTimer = setInterval(() => this.pump(), AgentTurnGate.RECHECK_MS);
		this.pumpTimer.unref();
	}

	private stopPump(): void {
		clearInterval(this.pumpTimer);
		this.pumpTimer = undefined;
	}

	private intakeRelease(): () => void {
		// Give a freed place directly to the next waiter, so that a new request cannot take it first.
		return once(() => {
			const next = this.intakeWaiters.shift();
			if (next) next(true);
			else this.intakeRunning--;
		});
	}

	/** The limit that blocks one more turn now, if any. */
	private blockedBy(now: number): AgentTurnHoldReason | undefined {
		const turns = this.turnsHere(now);
		// With no agent turn here, agent turns do not hold the memory. A hold could then never end.
		if (turns > 0 && this.memory.isHigh()) return 'main-memory-high';
		if (turns >= this.agentsConfig.mainMaxTurns) return 'main-at-limit';
		return undefined;
	}

	private admit(now: number, queuedAt?: number): boolean {
		const blocked = this.blockedBy(now);
		if (blocked) return this.hold(blocked, queuedAt);
		if (queuedAt !== undefined) {
			this.dropStaleHolds(now);
			for (const heldAt of this.held.keys()) {
				if (heldAt < queuedAt) return this.hold('main-at-limit', queuedAt);
			}
			this.held.delete(queuedAt);
		}
		this.recentClaims.push(now);
		return true;
	}

	private dropStaleHolds(now: number): void {
		for (const [queuedAt, checkedAt] of this.held) {
			if (now - checkedAt >= AgentTurnGate.HELD_TTL_MS) this.held.delete(queuedAt);
		}
	}

	private hold(reason: AgentTurnHoldReason, queuedAt?: number): false {
		if (queuedAt !== undefined) this.held.set(queuedAt, Date.now());
		this.metrics.record({ type: 'turn-held', reason });
		return false;
	}

	private skipStream(reason: AgentStreamSkipReason): undefined {
		this.metrics.record({ type: 'stream-skipped', reason });
		return undefined;
	}
}
