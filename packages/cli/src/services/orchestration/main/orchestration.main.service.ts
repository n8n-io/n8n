import { Service } from 'typedi';
import { OrchestrationService } from '../../orchestration.base.service';
import config from '@/config';
import { getRedisPrefix } from '../../redis/RedisServiceHelper';
import { LoggerProxy } from 'n8n-workflow';

export const LEADER_KEY = getRedisPrefix(config.getEnv('redis.prefix')) + ':main_instance_leader';
const LEADER_KEY_TTL = config.getEnv('redis.leaderSelection.ttl'); // seconds
const LEADER_KEY_CHECK_INTERVAL = config.getEnv('redis.leaderSelection.interval'); // seconds
export const LEADER_KEY_SET_RESULT = 'leaderKeySet';
export const EVENT_CURRENT_LEADER_CHECK = 'checkCurrentLeader';
export const EVENT_IS_CURRENT_LEADER = 'isCurrentLeader';
export const EVENT_LEADER_STATE_CHANGED = 'instanceLeaderStateChanged';

@Service()
export class OrchestrationMainService extends OrchestrationService {
	private thisIsLeader = false;

	private currentLeader: string | null = null;

	get isLeader(): boolean {
		return this.thisIsLeader;
	}

	get currentLeaderId(): string | null {
		return this.currentLeader;
	}

	sanityCheck(): boolean {
		return this.initialized && this.isQueueMode && this.isMainInstance;
	}

	async init() {
		await super.init();
		await this.trySetLeaderKey();
		setInterval(async () => {
			await this.checkLeaderKey(true);
		}, LEADER_KEY_CHECK_INTERVAL * 1000);
	}

	async trySetLeaderKey() {
		if (this.queueModeId && this.redisPublisher.redisClient) {
			const success = await this.redisPublisher.redisClient.setnx(LEADER_KEY, this.queueModeId);
			if (!!success !== this.thisIsLeader) {
				// leader state changed
				this.thisIsLeader = !!success;
				this.currentLeader = this.thisIsLeader ? this.queueModeId : null;
				this.emit(EVENT_LEADER_STATE_CHANGED, this.thisIsLeader);
			}
			if (success) {
				LoggerProxy.debug(`This instance is now the leader (${this.queueModeId})`);
				await this.redisPublisher.redisClient.expire(LEADER_KEY, LEADER_KEY_TTL);
			}
			this.emit(LEADER_KEY_SET_RESULT, success);
		}
	}

	async checkLeaderKey(renewTtl: boolean) {
		if (this.queueModeId && this.redisPublisher.redisClient) {
			const leader = await this.redisPublisher.redisClient.get(LEADER_KEY);
			const iAmTheLeader = leader === this.queueModeId;
			this.emit(EVENT_CURRENT_LEADER_CHECK, leader);
			if (!leader) {
				LoggerProxy.debug('Leader check: no leader found, attempting to become leader now');
				await this.trySetLeaderKey();
			} else if (iAmTheLeader && renewTtl) {
				LoggerProxy.debug('Leader check: extending my leader state TTL');
				await this.redisPublisher.redisClient.expire(LEADER_KEY, LEADER_KEY_TTL);
			} else if (!iAmTheLeader && leader) {
				this.currentLeader = leader;
				LoggerProxy.debug(`Leader check: other instance ${leader} is the leader`);
			}
		}
	}

	async getWorkerStatus(id?: string) {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'getId',
		});
	}

	async broadcastRestartEventbusAfterDestinationUpdate() {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'restartEventBus',
		});
	}

	async broadcastReloadExternalSecretsProviders() {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'reloadExternalSecretsProviders',
		});
	}

	async broadCastWorkflowWasUpdated(workflowId: string, pushSessionId: string = '') {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowWasUpdated',
			payload: {
				workflowId,
				pushSessionId,
			},
		});
	}

	async workflowWasActivated(workflowId: string, targets: string[], pushSessionId: string = '') {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'workflowWasActivated',
			targets,
			payload: {
				workflowId,
				pushSessionId,
			},
		});
	}
}
