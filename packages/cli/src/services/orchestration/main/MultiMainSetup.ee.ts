import { EventEmitter } from 'node:events';
import config from '@/config';
import { Service } from 'typedi';
import { TIME } from '@/constants';
import { getRedisPrefix } from '@/services/redis/RedisServiceHelper';
import { ErrorReporterProxy as EventReporter } from 'n8n-workflow';
import { Logger } from '@/Logger';
import { RedisServicePubSubPublisher } from '@/services/redis/RedisServicePubSubPublisher';

@Service()
export class MultiMainSetup extends EventEmitter {
	constructor(
		private readonly logger: Logger,
		private readonly redisPublisher: RedisServicePubSubPublisher,
	) {
		super();
	}

	get instanceId() {
		return config.getEnv('redis.queueModeId');
	}

	private readonly leaderKey = getRedisPrefix() + ':main_instance_leader';

	private readonly leaderKeyTtl = config.getEnv('multiMainSetup.ttl');

	private leaderCheckInterval: NodeJS.Timer | undefined;

	async init() {
		await this.tryBecomeLeader(); // prevent initial wait

		this.leaderCheckInterval = setInterval(
			async () => {
				await this.checkLeader();
			},
			config.getEnv('multiMainSetup.interval') * TIME.SECOND,
		);
	}

	async shutdown() {
		clearInterval(this.leaderCheckInterval);

		const isLeader = config.getEnv('multiMainSetup.instanceType') === 'leader';

		if (isLeader) await this.redisPublisher.clear(this.leaderKey);
	}

	private async checkLeader() {
		const leaderId = await this.redisPublisher.get(this.leaderKey);

		if (leaderId === this.instanceId) {
			this.logger.debug(`[Instance ID ${this.instanceId}] Leader is this instance`);

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);

			return;
		}

		if (leaderId && leaderId !== this.instanceId) {
			this.logger.debug(`[Instance ID ${this.instanceId}] Leader is other instance "${leaderId}"`);

			if (config.getEnv('multiMainSetup.instanceType') === 'leader') {
				config.set('multiMainSetup.instanceType', 'follower');

				this.emit('leader-stepdown'); // lost leadership - stop triggers, pollers, pruning, wait-tracking

				EventReporter.info('[Multi-main setup] Leader failed to renew leader key');
			}

			return;
		}

		if (!leaderId) {
			this.logger.debug(
				`[Instance ID ${this.instanceId}] Leadership vacant, attempting to become leader...`,
			);

			config.set('multiMainSetup.instanceType', 'follower');

			/**
			 * Lost leadership - stop triggers, pollers, pruning, wait tracking, license renewal
			 */
			this.emit('leader-stepdown');

			await this.tryBecomeLeader();
		}
	}

	private async tryBecomeLeader() {
		// this can only succeed if leadership is currently vacant
		const keySetSuccessfully = await this.redisPublisher.setIfNotExists(
			this.leaderKey,
			this.instanceId,
		);

		if (keySetSuccessfully) {
			this.logger.debug(`[Instance ID ${this.instanceId}] Leader is now this instance`);

			config.set('multiMainSetup.instanceType', 'leader');

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);

			/**
			 * Gained leadership - start triggers, pollers, pruning, wait-tracking, license renewal
			 */
			this.emit('leader-takeover');
		} else {
			config.set('multiMainSetup.instanceType', 'follower');
		}
	}

	async fetchLeaderKey() {
		return await this.redisPublisher.get(this.leaderKey);
	}
}
