import { GlobalConfig } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
import { Service } from 'typedi';

import config from '@/config';
import { TIME } from '@/constants';
import { Logger } from '@/logging/logger.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { RedisClientService } from '@/services/redis-client.service';
import { TypedEmitter } from '@/typed-emitter';

type MultiMainEvents = {
	/**
	 * Emitted when this instance loses leadership. In response, its various
	 * services will stop triggers, pollers, pruning, wait-tracking, license
	 * renewal, queue recovery, etc.
	 */
	'leader-stepdown': never;

	/**
	 * Emitted when this instance gains leadership. In response, its various
	 * services will start triggers, pollers, pruning, wait-tracking, license
	 * renewal, queue recovery, etc.
	 */
	'leader-takeover': never;
};

/** Designates leader and followers when running multiple main processes. */
@Service()
export class MultiMainSetup extends TypedEmitter<MultiMainEvents> {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly redisClientService: RedisClientService,
		private readonly globalConfig: GlobalConfig,
	) {
		super();
		this.logger = this.logger.withScope('scaling');
	}

	private leaderKey: string;

	private readonly leaderKeyTtl = this.globalConfig.multiMainSetup.ttl;

	private leaderCheckInterval: NodeJS.Timer | undefined;

	async init() {
		const prefix = config.getEnv('redis.prefix');
		const validPrefix = this.redisClientService.toValidPrefix(prefix);
		this.leaderKey = validPrefix + ':main_instance_leader';

		await this.tryBecomeLeader(); // prevent initial wait

		this.leaderCheckInterval = setInterval(async () => {
			await this.checkLeader();
		}, this.globalConfig.multiMainSetup.interval * TIME.SECOND);
	}

	async shutdown() {
		clearInterval(this.leaderCheckInterval);

		const { isLeader } = this.instanceSettings;

		if (isLeader) await this.publisher.clear(this.leaderKey);
	}

	private async checkLeader() {
		const leaderId = await this.publisher.get(this.leaderKey);

		const { hostId } = this.instanceSettings;

		if (leaderId === hostId) {
			this.logger.debug(`[Instance ID ${hostId}] Leader is this instance`);

			await this.publisher.setExpiration(this.leaderKey, this.leaderKeyTtl);

			return;
		}

		if (leaderId && leaderId !== hostId) {
			this.logger.debug(`[Instance ID ${hostId}] Leader is other instance "${leaderId}"`);

			if (this.instanceSettings.isLeader) {
				this.instanceSettings.markAsFollower();

				this.emit('leader-stepdown');

				this.logger.warn('[Multi-main setup] Leader failed to renew leader key');
			}

			return;
		}

		if (!leaderId) {
			this.logger.debug(
				`[Instance ID ${hostId}] Leadership vacant, attempting to become leader...`,
			);

			this.instanceSettings.markAsFollower();

			this.emit('leader-stepdown');

			await this.tryBecomeLeader();
		}
	}

	private async tryBecomeLeader() {
		const { hostId } = this.instanceSettings;

		// this can only succeed if leadership is currently vacant
		const keySetSuccessfully = await this.publisher.setIfNotExists(this.leaderKey, hostId);

		if (keySetSuccessfully) {
			this.logger.debug(`[Instance ID ${hostId}] Leader is now this instance`);

			this.instanceSettings.markAsLeader();

			await this.publisher.setExpiration(this.leaderKey, this.leaderKeyTtl);

			this.emit('leader-takeover');
		} else {
			this.instanceSettings.markAsFollower();
		}
	}

	async fetchLeaderKey() {
		return await this.publisher.get(this.leaderKey);
	}
}
