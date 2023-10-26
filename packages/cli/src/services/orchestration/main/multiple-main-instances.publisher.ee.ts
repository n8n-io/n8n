import config from '@/config';
import { Service } from 'typedi';
import { TIME } from '@/constants';
import { MainInstancePublisher } from '@/services/orchestration/main/main-instance.publisher';
import { getRedisPrefix } from '@/services/redis/RedisServiceHelper';

/**
 * Publishes to command channel and attempts to become leader. For use in
 * main instance only, having multiple main instances in the cluster.
 */
@Service()
export class MultipleMainInstancesPublisher extends MainInstancePublisher {
	id = this.queueModeId;

	isLeader = false;

	leaderId: string | null = null;

	leaderKeyCheckInterval: NodeJS.Timer | null = null;

	private readonly leaderKeyTtl = config.getEnv('leaderSelection.ttl');

	private readonly leaderKey = getRedisPrefix() + ':main_instance_leader';

	private readonly EVENTS = {
		LEADER_KEY_SET_RESULT: 'leaderKeySet',
		LEADER_CHECK: 'checkCurrentLeader',
		IS_LEADER: 'isCurrentLeader',
		LEADERSHIP_CHANGED: 'leadershipChanged',
	};

	async init() {
		await this.initPublisher();

		this.initialized = true;

		await this.trySetLeaderKey();

		this.setLeaderKeyCheckInterval();
	}

	async destroy() {
		if (this.leaderKeyCheckInterval) clearInterval(this.leaderKeyCheckInterval);

		if (this.id === this.leaderId) await this.redisPublisher.clear(this.leaderKey);
	}

	/**
	 * Try to set the leader key in Redis. This can only succeed if leadership is vacant.
	 */
	private async trySetLeaderKey() {
		if (!this.redisPublisher.redisClient) return;

		const keyWasSet = await this.redisPublisher.setIfNotExists(this.leaderKey, this.id);

		this.emit(this.EVENTS.LEADER_KEY_SET_RESULT, keyWasSet);

		if (keyWasSet && !this.isLeader) {
			this.emit(this.EVENTS.LEADERSHIP_CHANGED, this.isLeader);
			this.logger.debug(`Leader is now this instance "${this.id}"`);

			this.isLeader = true;
			this.leaderId = this.id;

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);
		}
	}

	private setLeaderKeyCheckInterval() {
		const rate = config.getEnv('leaderSelection.interval') * TIME.SECOND;

		this.leaderKeyCheckInterval = setInterval(async () => {
			await this.checkLeaderKey();
		}, rate);
	}

	private async checkLeaderKey() {
		if (!this.redisPublisher.redisClient) return;

		const leaderId = await this.redisPublisher.get(this.leaderKey);

		this.emit(this.EVENTS.LEADER_CHECK, leaderId);

		if (!leaderId) {
			this.logger.debug('No leader found, attempting to become leader...');

			await this.trySetLeaderKey();

			return;
		}

		if (this.id === leaderId) {
			this.logger.debug(`Leader is this instance "${this.id}"`);
			this.logger.debug(`Keeping leadership for ${this.leaderKeyTtl} seconds`);

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);
		} else {
			this.logger.debug(`Leader is other instance "${leaderId}"`);
			this.logger.debug(`Rechecking leadership in ${this.leaderKeyTtl} seconds`);

			this.leaderId = leaderId;
		}
	}
}
