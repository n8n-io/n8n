import config from '@/config';
import { Service } from 'typedi';
import { TIME } from '@/constants';
import { SingleMainInstancePublisher } from '@/services/orchestration/main/SingleMainInstance.publisher';
import { getRedisPrefix } from '@/services/redis/RedisServiceHelper';

/**
 * For use in main instance, in multiple main instances cluster.
 */
@Service()
export class MultiMainInstancePublisher extends SingleMainInstancePublisher {
	private id = this.queueModeId;

	private leaderId: string | undefined;

	public get isLeader() {
		return this.id === this.leaderId;
	}

	public get isFollower() {
		return !this.isLeader;
	}

	private readonly leaderKey = getRedisPrefix() + ':main_instance_leader';

	private readonly leaderKeyTtl = config.getEnv('leaderSelection.ttl');

	private leaderCheckInterval: NodeJS.Timer | undefined;

	async init() {
		await this.initPublisher();

		this.initialized = true;

		await this.tryBecomeLeader();

		this.leaderCheckInterval = setInterval(
			async () => {
				await this.checkLeader();
			},
			config.getEnv('leaderSelection.interval') * TIME.SECOND,
		);
	}

	async destroy() {
		clearInterval(this.leaderCheckInterval);

		if (this.isLeader) await this.redisPublisher.clear(this.leaderKey);
	}

	private async checkLeader() {
		if (!this.redisPublisher.redisClient) return;

		const leaderId = await this.redisPublisher.get(this.leaderKey);

		if (!leaderId) {
			this.logger.debug('Leadership vacant, attempting to become leader...');
			await this.tryBecomeLeader();

			return;
		}

		if (this.isLeader) {
			this.logger.debug(`Leader is this instance "${this.id}"`);

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);
		} else {
			this.logger.debug(`Leader is other instance "${leaderId}"`);

			this.leaderId = leaderId;
		}
	}

	private async tryBecomeLeader() {
		if (this.isLeader || !this.redisPublisher.redisClient) return;

		// this can only succeed if leadership is currently vacant
		const keySetSuccessfully = await this.redisPublisher.setIfNotExists(this.leaderKey, this.id);

		if (keySetSuccessfully) {
			this.logger.debug(`Leader is now this instance "${this.id}"`);

			this.leaderId = this.id;

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);
		}
	}
}
