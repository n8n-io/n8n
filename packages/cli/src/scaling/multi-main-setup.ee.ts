import { Logger, TypedEmitter } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { MultiMainMetadata } from '@n8n/decorators';
import type { MultiMainEventHandler } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import assert from 'node:assert';

import { LeaderElectionClient } from '@/scaling/leader-election-client';

type MultiMainEvents = {
	/**
	 * Emitted when this instance loses leadership. In response, its various
	 * services will stop triggers, pollers, pruning, wait-tracking, license
	 * renewal, queue recovery, insights, etc.
	 */
	'leader-stepdown': never;

	/**
	 * Emitted when this instance gains leadership. In response, its various
	 * services will start triggers, pollers, pruning, wait-tracking, license
	 * renewal, queue recovery, insights, etc.
	 */
	'leader-takeover': never;
};

/** Designates leader and followers when running multiple main processes. */
@Service()
export class MultiMainSetup extends TypedEmitter<MultiMainEvents> {
	private leaderCheckInterval: NodeJS.Timeout | undefined;

	private leaderCheckInProgress = false;

	private get hostId() {
		return this.instanceSettings.hostId;
	}

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly metadata: MultiMainMetadata,
		private readonly errorReporter: ErrorReporter,
		private readonly client: LeaderElectionClient,
	) {
		super();
		this.logger = this.logger.scoped(['scaling', 'multi-main-setup']);
	}

	async init() {
		const result = await this.client.setLeaderIfNotExists();
		if (!result.ok) {
			this.logRedisCommandFailure('Failed to set leader key in Redis during init', result.error);
			this.instanceSettings.markAsFollower();
		} else if (result.result) {
			// we became leader
			this.takeOverAsLeader();
		} else {
			this.instanceSettings.markAsFollower();
		}

		this.leaderCheckInterval = setInterval(async () => {
			await this.checkLeader();
		}, this.globalConfig.multiMainSetup.interval * Time.seconds.toMilliseconds);
	}

	// @TODO: Use `@OnShutdown()` decorator
	async shutdown() {
		clearInterval(this.leaderCheckInterval);

		if (this.instanceSettings.isLeader) {
			// TODO: We should guard here that we only remove the key the key in Redis matches
			// our host ID.
			const result = await this.client.clearLeader();
			if (!result.ok) {
				this.logger.warn('Failed to clear leader key from Redis', { error: result.error });
			}
		}

		this.client.destroy();
	}

	async fetchLeaderKey(): Promise<string | null> {
		const result = await this.client.getLeader();
		return result.ok ? result.result : null;
	}

	registerEventHandlers() {
		this.metadata.subscribe((handler) => this.attachHandler(handler));
	}

	private attachHandler({ eventHandlerClass, methodName, eventName }: MultiMainEventHandler) {
		// Resolve the instance lazily, when the event fires. A handler can register
		// while its class is still being decorated (method decorators run before the
		// `@Service` class decorator), so the class may not be DI-resolvable yet.
		this.on(eventName, async () => {
			const instance = Container.get(eventHandlerClass);
			return await instance[methodName].call(instance);
		});
	}

	private async checkLeader() {
		if (this.leaderCheckInProgress) {
			this.logger.warn('Previous leader check is still in progress, skipping this check');
			return;
		}

		this.leaderCheckInProgress = true;
		try {
			if (this.instanceSettings.isLeader) {
				await this.checkAreWeStillLeader();
			} else {
				await this.checkCanBecomeLeader();
			}
		} finally {
			this.leaderCheckInProgress = false;
		}
	}

	/** Renew our leadership lease. If we've lost the lease, step down to follower. */
	private async checkAreWeStillLeader() {
		assert(this.instanceSettings.isLeader);

		const renewTtlResult = await this.client.tryRenewLeaderTtl();
		if (!renewTtlResult.ok) {
			this.logRedisCommandFailure('Failed to renew leader TTL', renewTtlResult.error);
			// There's a decision to be made here: Do we step down or not? Redis might
			// be unavailable for all clients or only for us. We could also track the TTL
			// locally, but this would make the implementation more complex and error-prone.
			// For now we accept that this might cause some inconsistencies in a network
			// partition scenario, but eventually the system will recover once Redis is available again.
			return;
		}

		const renewalResult = renewTtlResult.result;
		if (renewalResult.id === 'success') {
			this.logger.debug(`[Instance ID ${this.hostId}] Leader is this instance`);
			return;
		}

		this.logger.warn('[Multi-main setup] Leader failed to renew leader key');

		if (renewalResult.id === 'other-host-is-leader') {
			this.logger.debug(
				`[Instance ID ${this.hostId}] Leader is other instance "${renewalResult.currentLeaderId}"`,
			);
			this.stepDownToFollower();
			return;
		}

		// The only remaining case is 'key-missing', which means we lost leadership
		// (e.g. due to Redis unavailability or a network partition). In this case
		// we try to become leader and step down if that fails.
		assert(renewalResult.id === 'key-missing');

		const result = await this.client.setLeaderIfNotExists();
		if (!result.ok) {
			this.logRedisCommandFailure('Failed to set leader key in Redis', result.error);
			this.stepDownToFollower();
			return;
		}

		if (!result.result) {
			this.stepDownToFollower();
		}
	}

	private async checkCanBecomeLeader() {
		assert(!this.instanceSettings.isLeader);

		const getResult = await this.client.getLeader();
		if (!getResult.ok) {
			this.logRedisCommandFailure('Failed to get leader key from Redis', getResult.error);
			return;
		}

		const leaderId = getResult.result;
		if (leaderId && leaderId === this.hostId) {
			this.errorReporter.info(
				`[Instance ID ${this.hostId}] Remote/Local leadership mismatch, marking self as leader`,
				{
					shouldBeLogged: true,
					shouldReport: true,
				},
			);

			this.takeOverAsLeader();
			return;
		}

		if (leaderId) {
			this.logger.debug(`[Instance ID ${this.hostId}] Leader is other instance "${leaderId}"`);
			return;
		}

		this.logger.debug(
			`[Instance ID ${this.hostId}] Leadership vacant, attempting to become leader...`,
		);

		const result = await this.client.setLeaderIfNotExists();
		if (!result.ok) {
			this.logger.warn('Failed to try leader key set in Redis', { error: result.error });
			return;
		}

		if (result.result) {
			this.takeOverAsLeader();
		}
	}

	private takeOverAsLeader() {
		assert(!this.instanceSettings.isLeader);

		this.logger.info(`[Instance ID ${this.hostId}] Leader is now this instance`);

		this.instanceSettings.markAsLeader();

		this.emit('leader-takeover');
	}

	private stepDownToFollower() {
		assert(this.instanceSettings.isLeader);

		this.logger.info(`[Instance ID ${this.hostId}] This is now a follower instance`);

		this.instanceSettings.markAsFollower();

		this.emit('leader-stepdown');
	}

	private logRedisCommandFailure(message: string, error: Error) {
		this.logger.warn(`${message}: ${error.message}`, { error });
	}
}
