import { Logger, TypedEmitter } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { MultiMainMetadata } from '@n8n/decorators';
import type { MultiMainEventHandler } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import type { HypervisorMessageHandler, HypervisorWorker } from './hypervisor-message-router';

export type LeaderClaim = { type: 'leader:claim' };
export type LeaderHeartbeat = { type: 'leader:heartbeat' };
export type LeaderAssign = { type: 'leader:assign'; isLeader: boolean };
export type LeaderMessage = LeaderClaim | LeaderHeartbeat | LeaderAssign;

function isLeaderAssign(message: unknown): message is LeaderAssign {
	return (
		typeof message === 'object' &&
		message !== null &&
		(message as { type?: unknown }).type === 'leader:assign'
	);
}

// Same event contract as MultiMainSetup, so the @OnLeaderTakeover/@OnLeaderStepdown
// consumers attach and fire identically.
type MultiMainEvents = {
	'leader-stepdown': never;
	'leader-takeover': never;
};

/**
 * Leader election driven by the hypervisor primary over the cluster IPC channel,
 * a drop-in for {@link MultiMainSetup} when running under `n8n hypervisor`.
 *
 * Leadership is a push assignment from the primary, but liveness is heartbeat
 * based: each main sends a periodic heartbeat so the primary can fail over a
 * *hung* (not crashed) leader that `cluster.on('exit')` would never catch. The
 * primary keeps the instant crash fast-path too.
 */
@Service()
export class HypervisorLeaderElection extends TypedEmitter<MultiMainEvents> {
	private resolveFirstAssign?: () => void;

	private heartbeatTimer?: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly metadata: MultiMainMetadata,
		private readonly globalConfig: GlobalConfig,
	) {
		super();
		this.logger = this.logger.scoped(['scaling', 'multi-main-setup']);
	}

	async init() {
		const firstAssign = new Promise<void>((resolve) => (this.resolveFirstAssign = resolve));
		process.on('message', this.onMessage);
		process.send?.({ type: 'leader:claim' } satisfies LeaderClaim);

		const intervalMs = this.globalConfig.multiMainSetup.interval * Time.seconds.toMilliseconds;
		this.heartbeatTimer = setInterval(() => {
			process.send?.({ type: 'leader:heartbeat' } satisfies LeaderHeartbeat);
		}, intervalMs);
		this.heartbeatTimer.unref(); // never keep the process alive on the heartbeat alone

		// Block boot until the primary assigns the initial role (one IPC round-trip),
		// mirroring how MultiMainSetup.init() decides the role synchronously.
		await firstAssign;
	}

	shutdown(): void {
		clearInterval(this.heartbeatTimer);
		process.off('message', this.onMessage);
	}

	registerEventHandlers() {
		this.metadata.subscribe((handler) => this.attachHandler(handler));
	}

	private onMessage = (message: unknown) => {
		if (!isLeaderAssign(message)) return;
		if (message.isLeader) this.becomeLeader();
		else this.becomeFollower();
		this.resolveFirstAssign?.();
		this.resolveFirstAssign = undefined;
	};

	private becomeLeader() {
		if (this.instanceSettings.isLeader) return;
		this.instanceSettings.markAsLeader();
		this.logger.info('Became leader (hypervisor assignment)');
		this.emit('leader-takeover');
	}

	private becomeFollower() {
		const wasLeader = this.instanceSettings.isLeader;
		this.instanceSettings.markAsFollower();
		// Only a runtime step-down emits; the initial follower assignment does not,
		// matching MultiMainSetup.
		if (wasLeader) this.emit('leader-stepdown');
	}

	private attachHandler({ eventHandlerClass, methodName, eventName }: MultiMainEventHandler) {
		// Resolve the instance lazily when the event fires (see MultiMainSetup.attachHandler).
		this.on(eventName, async () => {
			const instance = Container.get(eventHandlerClass);
			return await instance[methodName].call(instance);
		});
	}
}

/**
 * Primary-side counterpart of {@link HypervisorLeaderElection}: assigns leadership
 * among main-role workers over IPC. Single-threaded message loop ⇒ simultaneous
 * claims resolve in arrival order, no lock. Liveness is heartbeat based —
 * `onTick` fails over a main that stopped heartbeating (a *hung* leader), while
 * `onExit` handles a crashed one instantly.
 */
@Service()
export class LeaderElectionHost implements HypervisorMessageHandler {
	readonly prefix = 'leader:';

	private readonly claimants = new Map<number, { worker: HypervisorWorker; lastSeen: number }>();

	private leaderId: number | null = null;

	constructor(
		private logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped(['scaling', 'multi-main-setup']);
	}

	onMessage(worker: HypervisorWorker, message: { type: string }, now: number): void {
		if (message.type === 'leader:claim') this.onClaim(worker, now);
		else if (message.type === 'leader:heartbeat') this.onHeartbeat(worker.id, now);
	}

	onExit(worker: HypervisorWorker): void {
		this.dropAndMaybePromote(worker.id);
	}

	onTick(now: number): void {
		const timeoutMs = this.globalConfig.multiMainSetup.ttl * Time.seconds.toMilliseconds;
		for (const [id, { worker, lastSeen }] of this.claimants) {
			if (now - lastSeen <= timeoutMs) continue;
			this.logger.info(`Main id=${id} pid=${worker.process.pid} missed heartbeat; failing over`);
			const wasLeader = id === this.leaderId;
			this.dropAndMaybePromote(id);
			// Best-effort demotion in case it is hung rather than dead — delivered when
			// its event loop resumes, so it steps down and can't split-brain.
			if (wasLeader) worker.send({ type: 'leader:assign', isLeader: false } satisfies LeaderAssign);
		}
	}

	private onClaim(worker: HypervisorWorker, now: number): void {
		this.claimants.set(worker.id, { worker, lastSeen: now });
		if (this.leaderId === null) this.assign(worker);
		else worker.send({ type: 'leader:assign', isLeader: false } satisfies LeaderAssign);
	}

	private onHeartbeat(id: number, now: number): void {
		const entry = this.claimants.get(id);
		if (entry) entry.lastSeen = now;
	}

	private assign(worker: HypervisorWorker): void {
		this.leaderId = worker.id;
		worker.send({ type: 'leader:assign', isLeader: true } satisfies LeaderAssign);
		this.logger.info(`Leader = worker id=${worker.id} pid=${worker.process.pid}`);
	}

	private dropAndMaybePromote(id: number): void {
		this.claimants.delete(id);
		if (id !== this.leaderId) return;
		this.leaderId = null;
		const next = this.claimants.values().next().value;
		if (next) this.assign(next.worker);
		else this.logger.info('No main available to lead');
	}
}
