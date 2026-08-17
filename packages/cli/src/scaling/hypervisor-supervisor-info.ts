import type { ClusterProcessInfo } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { TransportModeService, type TransportSubsystem } from '@/scaling/transport-mode.service';

import type { HypervisorMessageHandler, HypervisorWorker } from './hypervisor-message-router';

const SUPERVISOR_QUERY_TIMEOUT_MS = 3_000;
/** How often each child pushes its live process info to the primary's cache. */
const SUPERVISOR_PUSH_INTERVAL_MS = 2_000;

const SUBSYSTEMS: readonly TransportSubsystem[] = [
	'leaderElection',
	'cache',
	'pubsub',
	'queue',
	'instanceRegistry',
];

/** Per-process snapshot a child pushes; the primary stamps pid + respawnCount. */
type ProcessInfo = Omit<ClusterProcessInfo, 'respawnCount'>;

export type SupervisorQuery = { type: 'supervisor:query'; requestId: number };
export type SupervisorCounts = {
	type: 'supervisor:counts';
	requestId: number;
	counts: Record<string, number>;
};
export type SupervisorProcessInfo = { type: 'supervisor:process-info'; info: ProcessInfo };
export type SupervisorAllQuery = { type: 'supervisor:all-query'; requestId: number };
export type SupervisorAll = {
	type: 'supervisor:all';
	requestId: number;
	processes: ClusterProcessInfo[];
};

const isSupervisorQuery = (m: { type: string }): m is SupervisorQuery =>
	m.type === 'supervisor:query' && typeof (m as SupervisorQuery).requestId === 'number';

const isSupervisorProcessInfo = (m: { type: string }): m is SupervisorProcessInfo =>
	m.type === 'supervisor:process-info' && typeof (m as SupervisorProcessInfo).info === 'object';

const isSupervisorAllQuery = (m: { type: string }): m is SupervisorAllQuery =>
	m.type === 'supervisor:all-query' && typeof (m as SupervisorAllQuery).requestId === 'number';

const isSupervisorCounts = (m: unknown): m is SupervisorCounts =>
	typeof m === 'object' &&
	m !== null &&
	(m as { type?: unknown }).type === 'supervisor:counts' &&
	typeof (m as SupervisorCounts).requestId === 'number';

const isSupervisorAll = (m: unknown): m is SupervisorAll =>
	typeof m === 'object' &&
	m !== null &&
	(m as { type?: unknown }).type === 'supervisor:all' &&
	typeof (m as SupervisorAll).requestId === 'number';

/**
 * Primary-side handler for the supervisor-info channel. Answers respawn-count
 * queries (counts live in the `createChildSupervisor` closure, read via a
 * provider), and caches each child's periodically-pushed process info so it can
 * answer an aggregate query with the live view of every forked process. The
 * cache is keyed by `worker.id` and pruned on child exit — the primary's
 * `cluster.on('exit')` is authoritative for liveness.
 */
@Service()
export class SupervisorInfoHost implements HypervisorMessageHandler {
	readonly prefix = 'supervisor:';

	private countsProvider: () => Record<string, number> = () => ({});

	private readonly processes = new Map<number, ClusterProcessInfo>();

	setCountsProvider(provider: () => Record<string, number>): void {
		this.countsProvider = provider;
	}

	onMessage(worker: HypervisorWorker, message: { type: string }): void {
		if (isSupervisorQuery(message)) {
			worker.send({
				type: 'supervisor:counts',
				requestId: message.requestId,
				counts: this.countsProvider(),
			} satisfies SupervisorCounts);
			return;
		}
		if (isSupervisorProcessInfo(message)) {
			// pid from the worker handle is primary-authoritative; respawnCount is the
			// primary's own tally for that role.
			this.processes.set(worker.id, {
				...message.info,
				pid: worker.process.pid ?? message.info.pid,
				respawnCount: this.countsProvider()[message.info.role] ?? 0,
			});
			return;
		}
		if (isSupervisorAllQuery(message)) {
			worker.send({
				type: 'supervisor:all',
				requestId: message.requestId,
				processes: [...this.processes.values()],
			} satisfies SupervisorAll);
		}
	}

	onExit(worker: HypervisorWorker): void {
		this.processes.delete(worker.id);
	}
}

/**
 * Worker-side client that asks the hypervisor primary for the respawn count of a
 * role. Returns `undefined` when not running under the hypervisor (no channel) or
 * on timeout, so callers degrade gracefully.
 */
@Service()
export class SupervisorInfoClient {
	private readonly pendingCounts = new Map<
		number,
		{ resolve: (counts?: Record<string, number>) => void; timer: NodeJS.Timeout }
	>();

	private readonly pendingAll = new Map<
		number,
		{ resolve: (processes?: ClusterProcessInfo[]) => void; timer: NodeJS.Timeout }
	>();

	private nextRequestId = 0;

	private pushTimer?: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly transportMode: TransportModeService,
		private readonly instanceSettings: InstanceSettings,
	) {
		process.on('message', this.onMessage);
	}

	async getRespawnCount(role: string): Promise<number | undefined> {
		if (!this.transportMode.isUnderHypervisor()) return undefined;
		const counts = await this.query();
		if (counts === undefined) return undefined; // primary did not answer
		return counts[role] ?? 0;
	}

	/** Live view of every forked process, from the primary's cache; `undefined` off-hypervisor or on timeout. */
	async getAllProcesses(): Promise<ClusterProcessInfo[] | undefined> {
		if (!this.transportMode.isUnderHypervisor()) return undefined;
		const requestId = this.nextRequestId++;
		return await new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pendingAll.delete(requestId);
				this.logger.warn('Supervisor process-list query timed out');
				resolve(undefined);
			}, SUPERVISOR_QUERY_TIMEOUT_MS);
			this.pendingAll.set(requestId, { resolve, timer });
			process.send?.({ type: 'supervisor:all-query', requestId } satisfies SupervisorAllQuery);
		});
	}

	/** This process's self-report (pid/role/leader/memory/uptime/transports), without respawnCount. */
	buildLocalInfo(): ProcessInfo {
		return {
			pid: process.pid,
			role: this.instanceSettings.instanceType,
			isLeader: this.instanceSettings.isLeader,
			uptimeSeconds: Math.round(process.uptime()),
			memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
			transports: Object.fromEntries(
				SUBSYSTEMS.map((subsystem) => [subsystem, this.transportMode.resolve(subsystem)]),
			),
		};
	}

	/**
	 * Start periodically pushing this child's live process info to the primary so
	 * an aggregate `/cluster-info` sees current memory for every process. No-op
	 * off-hypervisor or if already started. Timer is unref'd — never keeps the
	 * process alive.
	 */
	startPushing(): void {
		if (this.pushTimer || !this.transportMode.isUnderHypervisor()) return;
		const push = () =>
			process.send?.({
				type: 'supervisor:process-info',
				info: this.buildLocalInfo(),
			} satisfies SupervisorProcessInfo);
		push();
		this.pushTimer = setInterval(push, SUPERVISOR_PUSH_INTERVAL_MS);
		this.pushTimer.unref();
	}

	private async query(): Promise<Record<string, number> | undefined> {
		const requestId = this.nextRequestId++;
		return await new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pendingCounts.delete(requestId);
				this.logger.warn('Supervisor respawn-count query timed out');
				resolve(undefined);
			}, SUPERVISOR_QUERY_TIMEOUT_MS);
			this.pendingCounts.set(requestId, { resolve, timer });
			process.send?.({ type: 'supervisor:query', requestId } satisfies SupervisorQuery);
		});
	}

	private onMessage = (message: unknown) => {
		if (isSupervisorCounts(message)) {
			const entry = this.pendingCounts.get(message.requestId);
			if (!entry) return;
			clearTimeout(entry.timer);
			this.pendingCounts.delete(message.requestId);
			entry.resolve(message.counts);
			return;
		}
		if (isSupervisorAll(message)) {
			const entry = this.pendingAll.get(message.requestId);
			if (!entry) return;
			clearTimeout(entry.timer);
			this.pendingAll.delete(message.requestId);
			entry.resolve(message.processes);
		}
	};
}
