import config from '@/config';
import { Service } from 'typedi';
import { TIME } from '@/constants';
import { SingleMainSetup } from '@/services/orchestration/main/SingleMainSetup';
import { getRedisPrefix } from '@/services/redis/RedisServiceHelper';

@Service()
export class MultiMainSetup extends SingleMainSetup {
	private id = this.queueModeId;

	private isLicensed = false;

	get isEnabled() {
		return (
			config.getEnv('executions.mode') === 'queue' &&
			config.getEnv('multiMainSetup.enabled') &&
			config.getEnv('generic.instanceType') === 'main' &&
			this.isLicensed
		);
	}

	get isLeader() {
		return config.getEnv('multiMainSetup.instanceType') === 'leader';
	}

	get isFollower() {
		return !this.isLeader;
	}

	setLicensed(newState: boolean) {
		this.isLicensed = newState;
	}

	private readonly leaderKey = getRedisPrefix() + ':main_instance_leader';

	private readonly leaderKeyTtl = config.getEnv('multiMainSetup.ttl');

	private leaderCheckInterval: NodeJS.Timer | undefined;

	async init() {
		if (!this.isEnabled || this.isInitialized) return;

		await this.initPublisher();

		this.isInitialized = true;

		await this.tryBecomeLeader(); // prevent initial wait

		this.leaderCheckInterval = setInterval(
			async () => {
				await this.checkLeader();
			},
			config.getEnv('multiMainSetup.interval') * TIME.SECOND,
		);
	}

	async shutdown() {
		if (!this.isInitialized) return;

		clearInterval(this.leaderCheckInterval);

		if (this.isLeader) await this.redisPublisher.clear(this.leaderKey);
	}

	private async checkLeader() {
		const leaderId = await this.redisPublisher.get(this.leaderKey);

		if (leaderId === this.id) {
			this.logger.debug(`[Instance ID ${this.id}] Leader is this instance`);

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);

			return;
		}

		if (leaderId && leaderId !== this.id) {
			this.logger.debug(`[Instance ID ${this.id}] Leader is other instance "${leaderId}"`);

			if (config.getEnv('multiMainSetup.instanceType') === 'leader') {
				this.emit('leadershipChange', leaderId); // stop triggers, pruning, etc.

				config.set('multiMainSetup.instanceType', 'follower');
			}

			return;
		}

		if (!leaderId) {
			this.logger.debug(
				`[Instance ID ${this.id}] Leadership vacant, attempting to become leader...`,
			);

			config.set('multiMainSetup.instanceType', 'follower');

			await this.tryBecomeLeader();
		}
	}

	private async tryBecomeLeader() {
		// this can only succeed if leadership is currently vacant
		const keySetSuccessfully = await this.redisPublisher.setIfNotExists(this.leaderKey, this.id);

		if (keySetSuccessfully) {
			this.logger.debug(`[Instance ID ${this.id}] Leader is now this instance`);

			config.set('multiMainSetup.instanceType', 'leader');

			await this.redisPublisher.setExpiration(this.leaderKey, this.leaderKeyTtl);

			this.emit('leadershipChange', this.id);
		} else {
			config.set('multiMainSetup.instanceType', 'follower');
		}
	}

	async broadcastWorkflowActiveStateChanged(payload: {
		workflowId: string;
		oldState: boolean;
		newState: boolean;
		versionId: string;
	}) {
		if (!this.sanityCheck()) return;

		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowActiveStateChanged',
			payload,
		});
	}

	async broadcastWorkflowFailedToActivate(payload: { workflowId: string; errorMessage: string }) {
		if (!this.sanityCheck()) return;

		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowFailedToActivate',
			payload,
		});
	}
}
