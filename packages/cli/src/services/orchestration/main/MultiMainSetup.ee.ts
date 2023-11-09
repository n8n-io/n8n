import config from '@/config';
import { Service } from 'typedi';
import { TIME } from '@/constants';
import { SingleMainSetup } from '@/services/orchestration/main/SingleMainSetup';
import { getRedisPrefix } from '@/services/redis/RedisServiceHelper';

class NotInitializedError extends Error {
	constructor() {
		super('MultiMainSetup class has not been initialized');
	}
}

@Service()
export class MultiMainSetup extends SingleMainSetup {
	private id = this.queueModeId;

	private leaderId: string | undefined;

	private isLicensed = false;

	get isEnabled() {
		return (
			config.getEnv('executions.mode') === 'queue' &&
			config.getEnv('leaderSelection.enabled') &&
			this.isLicensed
		);
	}

	get isLeader() {
		if (!this.isInitialized) throw new NotInitializedError();

		return this.id === this.leaderId;
	}

	get isFollower() {
		return !this.isLeader;
	}

	setLicensed(newState: boolean) {
		this.isLicensed = newState;
	}

	private readonly leaderKey = getRedisPrefix() + ':main_instance_leader';

	private readonly leaderKeyTtl = config.getEnv('leaderSelection.ttl');

	private leaderCheckInterval: NodeJS.Timer | undefined;

	async init() {
		if (this.isInitialized) return;

		await this.initPublisher();

		this.isInitialized = true;

		await this.tryBecomeLeader();

		this.leaderCheckInterval = setInterval(
			async () => {
				await this.checkLeader();
			},
			config.getEnv('leaderSelection.interval') * TIME.SECOND,
		);
	}

	async shutdown() {
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

			this.emit('leadershipChange', this.id);

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);
		}
	}

	async broadcastWorkflowWasUpdated(workflowId: string, pushSessionId = '') {
		if (!this.sanityCheck()) return;

		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowWasUpdated',
			payload: { workflowId, pushSessionId },
		});
	}

	async broadcastWorkflowWasActivated(workflowId: string, targets: string[], pushSessionId = '') {
		if (!this.sanityCheck()) return;

		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowWasActivated',
			targets,
			payload: { workflowId, pushSessionId },
		});
	}

	async broadcastWorkflowWasDeactivated(workflowId: string, pushSessionId = '') {
		if (!this.sanityCheck()) return;

		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowWasDeactivated',
			payload: { workflowId, pushSessionId },
		});
	}
}
