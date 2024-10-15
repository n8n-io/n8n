import { InstanceSettings } from 'n8n-core';
import { Service } from 'typedi';

import config from '@/config';
import { TIME } from '@/constants';
import { Logger } from '@/logging/logger.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { RedisClientService } from '@/services/redis-client.service';
import { TypedEmitter } from '@/typed-emitter';

type MultiMainEvents = {
	'leader-stepdown': never;
	'leader-takeover': never;
};

@Service()
export class MultiMainSetup extends TypedEmitter<MultiMainEvents> {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly redisClientService: RedisClientService,
	) {
		super();
	}

	private leaderKey: string;

	private readonly leaderKeyTtl = config.getEnv('multiMainSetup.ttl');

	private leaderCheckInterval: NodeJS.Timer | undefined;

	async init() {
		const prefix = config.getEnv('redis.prefix');
		const validPrefix = this.redisClientService.toValidPrefix(prefix);
		this.leaderKey = validPrefix + ':main_instance_leader';

		await this.tryBecomeLeader(); // prevent initial wait

		this.leaderCheckInterval = setInterval(async () => {
			await this.checkLeader();
		}, config.getEnv('multiMainSetup.interval') * TIME.SECOND);
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

				this.emit('leader-stepdown'); // lost leadership - stop triggers, pollers, pruning, wait-tracking, queue recovery

				this.logger.warn('[Multi-main setup] Leader failed to renew leader key');
			}

			return;
		}

		if (!leaderId) {
			this.logger.debug(
				`[Instance ID ${hostId}] Leadership vacant, attempting to become leader...`,
			);

			this.instanceSettings.markAsFollower();

			/**
			 * Lost leadership - stop triggers, pollers, pruning, wait tracking, license renewal, queue recovery
			 */
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

			/**
			 * Gained leadership - start triggers, pollers, pruning, wait-tracking, license renewal, queue recovery
			 */
			this.emit('leader-takeover');
		} else {
			this.instanceSettings.markAsFollower();
		}
	}

	async fetchLeaderKey() {
		return await this.publisher.get(this.leaderKey);
	}
}
