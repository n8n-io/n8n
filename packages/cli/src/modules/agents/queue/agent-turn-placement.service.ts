import { AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { InstanceRegistryProxyService } from '@n8n/backend-services';

import { AgentClusterService } from '../agent-cluster.service';
import type { AgentQueueDispatch } from '../types/agent-queued-message';
import { AgentMainMemory } from './agent-main-memory.service';
import type { AgentTurnHoldReason } from './agent-queue-metrics';
import { AgentTurnQueue } from './agent-turn-queue.service';

export type QueuedTurnKind = AgentQueueDispatch['kind'];

/**
 * Turn kinds that a worker can run. The rest stay on mains.
 *
 * `integration` turns go to workers only for `WORKER_PLATFORMS`. `system` turns
 * (n8n Assistant) always stay on mains: the Assistant registers its provider,
 * workspace lease and tool closures only on main instances, so a worker cannot
 * build the runtime of a system turn.
 */
const WORKER_KINDS: ReadonlySet<QueuedTurnKind> = new Set(['preview', 'n8n_chat']);

/**
 * Chat platforms whose replies a worker can send over a send-only connection.
 * Discord needs the Gateway connection hook of a main, and WhatsApp keeps its
 * send rate guard for each connection, so their turns stay on mains.
 */
const WORKER_PLATFORMS: ReadonlySet<string> = new Set(['slack', 'teams', 'telegram', 'linear']);

/**
 * Decides where a queued agent turn runs.
 *
 * Mains send worker kinds to workers when the flag is on and a worker with
 * the `agent-turns` capability is registered. When no such worker exists, a
 * main runs the turn itself.
 *
 * A main also takes over a turn that waited longer than `FALLBACK_WAIT_MS`,
 * but only when the workers are stuck and the main has room. Busy workers are
 * not stuck: they still start or finish jobs. Without this guard, a full queue
 * would move all of its turns to the mains at once, which also serve the UI
 * and webhooks. See `mayFallBack`.
 *
 * A main that sends turns to workers also limits every turn that it runs
 * itself, by count and by its memory use. A turn over a limit stays in the
 * queue. See `admit`.
 *
 * Every process still claims through the database, so a wrong guess here can
 * only delay a turn, not run it twice.
 */
@Service()
export class AgentTurnPlacement {
	/** A message older than this runs on a main, even when workers are registered. */
	static readonly FALLBACK_WAIT_MS = 30_000;

	/** How long a registry read about agent workers stays valid. */
	static readonly WORKER_CHECK_TTL_MS = 5_000;

	/**
	 * A turn that this process took counts toward its limits for this long, even
	 * before it shows as a running turn. Many checks run at once after a scan,
	 * so without this they would all see the same free room.
	 */
	static readonly CLAIM_START_MS = 5_000;

	/**
	 * How long a held turn keeps its place ahead of newer turns. Longer than a
	 * queue scan, so that each scan renews the turns that still wait.
	 */
	static readonly HELD_TTL_MS = 12_000;

	private recentClaims: number[] = [];

	/** Queue time of each turn that `admit` held, with the time of the last check. */
	private readonly held = new Map<number, number>();

	private workerCheck?: { at: number; available: boolean };

	private workerCheckInFlight?: Promise<boolean>;

	private fallbackClaims = 0;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly cluster: AgentClusterService,
		private readonly registry: InstanceRegistryProxyService,
		private readonly turnQueue: AgentTurnQueue,
		private readonly memory: AgentMainMemory,
	) {}

	/** True on a main that may send turns to workers. */
	get dispatchEnabled(): boolean {
		return (
			this.cluster.isMain &&
			this.cluster.shouldRelayAcrossProcesses() &&
			this.agentsConfig.queueModeEnabled
		);
	}

	/** True on a worker that runs agent turns. */
	get runsTurnsOnWorker(): boolean {
		return (
			this.cluster.isWorker &&
			this.cluster.shouldRelayAcrossProcesses() &&
			this.agentsConfig.workerEnabled
		);
	}

	/**
	 * True on a process that may send jobs to agent workers: a main that
	 * dispatches, or an agent worker. An agent worker sends the resume of a
	 * workflow tool whose sub-workflow finished on it.
	 */
	get sendsJobs(): boolean {
		return this.dispatchEnabled || this.runsTurnsOnWorker;
	}

	/** `platform` is the chat platform of an `integration` turn. */
	isWorkerKind(kind: QueuedTurnKind, platform?: string): boolean {
		if (kind === 'integration') return platform !== undefined && WORKER_PLATFORMS.has(platform);
		return WORKER_KINDS.has(kind);
	}

	/** Number of worker-kind turns that a main ran because no worker took them. */
	get fallbackCount(): number {
		return this.fallbackClaims;
	}

	/**
	 * Whether a worker with the `agent-turns` capability is registered. Reads
	 * the registry at most once each `WORKER_CHECK_TTL_MS`.
	 */
	async workersAvailable(): Promise<boolean> {
		if (!this.sendsJobs) return false;
		const now = Date.now();
		if (this.workerCheck && now - this.workerCheck.at < AgentTurnPlacement.WORKER_CHECK_TTL_MS) {
			return this.workerCheck.available;
		}
		this.workerCheckInFlight ??= this.readWorkers().finally(() => {
			this.workerCheckInFlight = undefined;
		});
		return await this.workerCheckInFlight;
	}

	/** Whether this process may claim a queued message now. */
	async mayClaim(kind: QueuedTurnKind, queuedAt: Date, platform?: string): Promise<boolean> {
		if (this.cluster.isWorker) return this.runsTurnsOnWorker && this.isWorkerKind(kind, platform);
		// Without agent queue mode, a main runs every turn, as before.
		if (!this.dispatchEnabled) return true;
		if (!this.isWorkerKind(kind, platform) || !(await this.workersAvailable())) {
			return this.admit(Date.now(), queuedAt.getTime());
		}
		return await this.mayFallBack(queuedAt.getTime(), 'queued-message');
	}

	/**
	 * Tell that the claim after a true `mayClaim` ended. A claimed turn now
	 * shows as a running turn, so it must not count twice.
	 */
	claimSettled(): void {
		if (this.dispatchEnabled) this.recentClaims.shift();
	}

	/** True while a turn waits for room on this main. The caller then checks the queue when a turn ends. */
	get hasHeldTurns(): boolean {
		this.dropStaleHolds(Date.now());
		return this.held.size > 0;
	}

	/**
	 * Whether this main may open a live chat stream now. False when its memory
	 * is high. The message is still accepted, and the chat loads the reply from
	 * the recorded history.
	 */
	mayOpenStream(): boolean {
		if (!this.dispatchEnabled || !this.memory.isHigh()) return true;
		this.cluster.metrics.record({ type: 'stream-skipped' });
		return false;
	}

	/**
	 * Whether this main may run a worker turn that was sent at `sentAt` and no
	 * worker took. The turn must have waited at least `FALLBACK_WAIT_MS`. While
	 * an agent worker is registered, these must also hold:
	 * - no agent job started or ended in that time, so the workers are stuck,
	 *   not busy,
	 * - this main runs fewer agent turns than `N8N_AGENTS_MAIN_FALLBACK_TURNS`.
	 * The limits of `admit` apply with or without a worker.
	 * A true result counts as a fallback, so call it only right before a claim.
	 */
	async mayFallBack(sentAt: number, path: 'queued-message' | 'request'): Promise<boolean> {
		const now = Date.now();
		if (now - sentAt < AgentTurnPlacement.FALLBACK_WAIT_MS) return false;
		if (await this.workersAvailable()) {
			const progressAt = this.turnQueue.lastProgressAt;
			if (progressAt !== undefined && now - progressAt < AgentTurnPlacement.FALLBACK_WAIT_MS) {
				return this.hold('workers-progressing');
			}
			if (this.turnsHere(now) >= this.agentsConfig.mainFallbackTurns) {
				return this.hold('main-at-limit');
			}
		}
		// An agent worker also asks here, for a request that it sent itself.
		if (this.dispatchEnabled) {
			if (!this.admit(now)) return false;
		} else this.recentClaims.push(now);
		this.fallbackClaims++;
		this.cluster.metrics.record({ type: 'fallback', path });
		return true;
	}

	/**
	 * Whether this main has room to run one more agent turn, of any kind. A
	 * true result counts as a taken turn, so call it only right before a claim.
	 *
	 * A queued turn that was held keeps its place: a turn queued at `queuedAt`
	 * also waits while an older held turn waits. Without this, new messages
	 * take each free place first, and held turns wait for the next queue scan.
	 */
	private admit(now: number, queuedAt?: number): boolean {
		const turns = this.turnsHere(now);
		// With no agent turn here, agent turns do not hold the memory. A hold could then never end.
		if (turns > 0 && this.memory.isHigh()) return this.hold('main-memory-high', queuedAt);
		if (turns >= this.agentsConfig.mainMaxTurns) return this.hold('main-at-limit', queuedAt);
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
			if (now - checkedAt >= AgentTurnPlacement.HELD_TTL_MS) this.held.delete(queuedAt);
		}
	}

	/** Running agent turns here, plus turns taken that may not run yet. */
	private turnsHere(now: number): number {
		this.recentClaims = this.recentClaims.filter(
			(at) => now - at < AgentTurnPlacement.CLAIM_START_MS,
		);
		return this.cluster.metrics.localTurns() + this.recentClaims.length;
	}

	private hold(reason: AgentTurnHoldReason, queuedAt?: number): false {
		if (queuedAt !== undefined) this.held.set(queuedAt, Date.now());
		this.cluster.metrics.record({ type: 'turn-held', reason });
		return false;
	}

	private async readWorkers(): Promise<boolean> {
		let available = false;
		try {
			const instances = await this.registry.getAllInstances();
			available = instances.some(
				({ instanceType, capabilities }) =>
					instanceType === 'worker' && capabilities?.includes(AGENT_TURNS_CAPABILITY) === true,
			);
		} catch {
			// Fall back to running turns on mains when the registry cannot be read.
			available = false;
		}
		this.workerCheck = { at: Date.now(), available };
		return available;
	}
}
