import { Logger, TypedEmitter } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { MultiMainMetadata } from '@n8n/decorators';
import type { MultiMainEventHandler } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

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
