import { AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { InstanceRegistryProxyService } from '@n8n/backend-services';

import { AgentClusterService } from '../agent-cluster.service';
import type { AgentQueueDispatch } from '../types/agent-queued-message';
import type { AgentTurnHoldReason } from './agent-queue-metrics';
import { AgentTurnGate } from './agent-turn-gate.service';
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
 * Decides where an agent turn runs: on an agent worker, or on this main.
 * Whether this main has room for a turn is the job of `AgentTurnGate`.
 *
 * Mains send worker kinds to workers when the flag is on and a worker with
 * the `agent-turns` capability is registered. When no such worker exists, a
 * main runs the turn itself, within the limits of the gate.
 *
 * While an agent worker is registered, a main runs no worker-kind turn by
 * default: turns wait in the agent queue, and n8n rejects them when they wait
 * too long. `N8N_AGENTS_MAIN_FALLBACK_TURNS` lets a main take over turns
 * that waited longer than `FALLBACK_WAIT_MS`, but only when the workers are
 * stuck. Busy workers are not stuck: they still start or finish jobs. See
 * `mayFallBack`.
 *
 * Every process still claims through the database, so a wrong guess here can
 * only delay a turn, not run it twice.
 */
@Service()
export class AgentTurnPlacement {
	/** A turn must wait this long before a main may take it over from the workers. */
	static readonly FALLBACK_WAIT_MS = 30_000;

	/** How long a registry read about agent workers stays valid. */
	static readonly WORKER_CHECK_TTL_MS = 5_000;

	private workerCheck?: { at: number; available: boolean };

	private workerCheckInFlight?: Promise<boolean>;

	private fallbackClaims = 0;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly cluster: AgentClusterService,
		private readonly registry: InstanceRegistryProxyService,
		private readonly turnQueue: AgentTurnQueue,
		private readonly gate: AgentTurnGate,
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

	/** Whether a queued message of this kind goes to an agent worker now. */
	async goesToWorker(kind: QueuedTurnKind, platform?: string): Promise<boolean> {
		return (
			this.dispatchEnabled && this.isWorkerKind(kind, platform) && (await this.workersAvailable())
		);
	}

	/**
	 * Whether this process may claim a queued message now. A true result on a
	 * main counts as a taken turn, see `AgentTurnGate.claimSettled`.
	 */
	async mayClaim(kind: QueuedTurnKind, queuedAt: Date, platform?: string): Promise<boolean> {
		if (this.cluster.isWorker) return this.runsTurnsOnWorker && this.isWorkerKind(kind, platform);
		if (!(await this.goesToWorker(kind, platform))) {
			return this.gate.mayStartQueued(queuedAt.getTime());
		}
		return await this.mayFallBack(queuedAt.getTime(), 'queued-message');
	}

	/**
	 * Whether too many turns already wait, so n8n must reject a new turn of
	 * this kind. Turns for agent workers count in the shared agent queue, up to
	 * `N8N_AGENTS_QUEUE_MAX_WAITING`. Turns for this main count in the gate of
	 * this main, up to the same limit. A true result counts as a rejection, so
	 * call it only right before a reject.
	 */
	async queueFull(toWorker: boolean): Promise<boolean> {
		const limit = this.agentsConfig.queueMaxWaiting;
		if (limit <= 0) return false;
		const waiting = toWorker ? await this.turnQueue.waitingCount() : this.gate.waiting();
		if (waiting < limit) return false;
		this.gate.rejected('queue-full');
		return true;
	}

	/** The `Retry-After` time for a turn that n8n rejects now. */
	async retryAfterSeconds(): Promise<number> {
		if (await this.workersAvailable()) {
			return this.gate.retryAfterSeconds(await this.turnQueue.waitingCount());
		}
		return this.gate.retryAfterSeconds();
	}

	/**
	 * Whether this main may take over a worker turn that was sent at `sentAt`
	 * and that no worker took. The turn must have waited at least
	 * `FALLBACK_WAIT_MS`. While an agent worker is registered, these must also
	 * hold:
	 * - no agent job started or ended in that time, so the workers are stuck,
	 *   not busy,
	 * - this main runs fewer agent turns than `N8N_AGENTS_MAIN_FALLBACK_TURNS`.
	 *   The default of 0 means a main never takes over from a running worker.
	 * The limits of the gate apply with or without a worker.
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
			if (this.gate.turnsHere(now) >= this.agentsConfig.mainFallbackTurns) {
				return this.hold('main-at-limit');
			}
		}
		// An agent worker also asks here, for a request that it sent itself. Its own job limit applies.
		if (this.dispatchEnabled && !this.gate.tryTake()) return false;
		this.fallbackClaims++;
		this.cluster.metrics.record({ type: 'fallback', path });
		return true;
	}

	private hold(reason: AgentTurnHoldReason): false {
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
