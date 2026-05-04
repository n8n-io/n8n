import { RedisLeaderElectionStorage } from '@/scaling/redis-leader-election-storage';
import { TypedEmitter } from '@/typed-emitter';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { MultiMainMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import assert from 'node:assert';

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
	private get hostId() {
		return this.instanceSettings.hostId;
	}

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly metadata: MultiMainMetadata,
		private readonly errorReporter: ErrorReporter,
		private readonly storage: RedisLeaderElectionStorage,
	) {
		super();
		this.logger = this.logger.scoped(['scaling', 'multi-main-setup']);
	}

	private leaderCheckInterval: NodeJS.Timeout | undefined;

	private leaderCheckInProgress = false;

	async init() {
		const result = await this.storage.setLeaderIfNotExists(this.hostId); // prevent initial wait
		if (!result.ok) {
			this.logRedisCommandFailure('Failed to set leader key in Redis during init', result.error);
		} else if (result.result) {
			this.becomeLeader();
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

		const { isLeader } = this.instanceSettings;

		if (isLeader) {
			// TODO: We should guard here that we only remove the key the key in Redis matches
			// our host ID.
			const result = await this.storage.clearLeader();
			if (!result.ok) {
				this.logger.warn('Failed to clear leader key from Redis', { error: result.error });
			}
		}

		this.storage.destroy();
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

	private async checkAreWeStillLeader() {
		assert(this.instanceSettings.isLeader);

		const renewTtlResult = await this.storage.tryRenewLeaderTtl(this.hostId);
		if (!renewTtlResult.ok) {
			this.logRedisCommandFailure('Failed to renew leader TTL', renewTtlResult.error);
			// TODO: There's a decision to be made here: Do we step down or not? Basically we
			// either optimize for availability or correctness. For now we assume the
			// connection will eventually recover, since the RedisClientService will
			// terminate the process if the connection is down for too long
			return;
		}

		const renewalResult = renewTtlResult.result;
		if (renewalResult.id === 'success') {
			this.logger.debug(`[Instance ID ${this.hostId}] Leader is this instance`);
			// Successfully renewed TTL, still leader
			return;
		}

		this.logger.warn('[Multi-main setup] Leader failed to renew leader key');

		if (renewalResult.id === 'other-host-is-leader') {
			this.logger.debug(
				`[Instance ID ${this.hostId}] Leader is other instance "${renewalResult.currentLeaderId}"`,
			);
			this.becomeFollower();
			return;
		}

		const result = await this.storage.setLeaderIfNotExists(this.hostId);
		if (!result.ok) {
			this.logRedisCommandFailure('Failed to set leader key in Redis', result.error);
			this.becomeFollower();
			return;
		}

		const wasSet = result.result;
		if (!wasSet) {
			this.becomeFollower();
		}
	}

	private async checkCanBecomeLeader() {
		assert(!this.instanceSettings.isLeader);

		const getResult = await this.storage.getLeader();
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

			this.becomeLeader();
			return;
		}

		if (leaderId) {
			this.logger.debug(`[Instance ID ${this.hostId}] Leader is other instance "${leaderId}"`);
			return;
		}

		this.logger.debug(
			`[Instance ID ${this.hostId}] Leadership vacant, attempting to become leader...`,
		);

		const result = await this.storage.setLeaderIfNotExists(this.hostId);
		if (!result.ok) {
			this.logger.warn('Failed to try leader key set in Redis', { error: result.error });
			return;
		}

		const wasSet = result.result;
		if (wasSet) {
			this.becomeLeader();
		}
	}

	/** Transition this instance to leader */
	private becomeLeader() {
		assert(!this.instanceSettings.isLeader);

		this.logger.info(`[Instance ID ${this.hostId}] Leader is now this instance`);

		this.instanceSettings.markAsLeader();

		this.emit('leader-takeover');
	}

	/** Transition this instance to follower */
	private becomeFollower() {
		assert(this.instanceSettings.isLeader);

		this.logger.info(`[Instance ID ${this.hostId}] This is now a follower instance`);

		this.instanceSettings.markAsFollower();

		this.emit('leader-stepdown');
	}

	async fetchLeaderKey() {
		return await this.storage.getLeader();
	}

	registerEventHandlers() {
		const handlers = this.metadata.getHandlers();

		for (const { eventHandlerClass, methodName, eventName } of handlers) {
			const instance = Container.get(eventHandlerClass);
			this.on(eventName, async () => {
				return await instance[methodName].call(instance);
			});
		}
	}

	private logRedisCommandFailure(message: string, error: Error) {
		this.logger.warn(`${message}: ${error.message}`, { error });
	}
}
