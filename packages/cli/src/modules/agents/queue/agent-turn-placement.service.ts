import { AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { InstanceRegistryProxyService } from '@n8n/backend-services';

import { AgentClusterService } from '../agent-cluster.service';
import type { AgentQueueDispatch } from '../types/agent-queued-message';

export type QueuedTurnKind = AgentQueueDispatch['kind'];

/** Turn kinds that a worker can run. The rest stay on mains. */
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
 * the `agent-turns` capability is registered. When no such worker exists, or
 * a message waited longer than `FALLBACK_WAIT_MS`, a main runs it itself.
 * Every process still claims through the database, so a wrong guess here can
 * only delay a turn, not run it twice.
 */
@Service()
export class AgentTurnPlacement {
	/** A message older than this runs on a main, even when workers are registered. */
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
		if (!this.isWorkerKind(kind, platform) || !(await this.workersAvailable())) return true;
		if (Date.now() - queuedAt.getTime() < AgentTurnPlacement.FALLBACK_WAIT_MS) return false;
		this.fallbackClaims++;
		return true;
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
