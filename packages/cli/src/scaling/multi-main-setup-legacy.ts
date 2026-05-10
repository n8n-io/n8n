import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { RedisClientService } from '@/services/redis-client.service';

import type { MultiMainStrategy } from './multi-main-setup.types';

type EmitFn = (event: 'leader-takeover' | 'leader-stepdown') => void;

export class MultiMainSetupLegacy implements MultiMainStrategy {
	private leaderKey: string;

	private readonly leaderKeyTtl: number;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly redisClientService: RedisClientService,
		private readonly globalConfig: GlobalConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly emit: EmitFn,
	) {
		this.leaderKeyTtl = this.globalConfig.multiMainSetup.ttl;
	}

	async init() {
		const prefix = this.globalConfig.redis.prefix;
		const validPrefix = this.redisClientService.toValidPrefix(prefix);
		this.leaderKey = validPrefix + ':main_instance_leader';

		await this.tryBecomeLeader();
	}

	async shutdown() {
		const { isLeader } = this.instanceSettings;

		if (isLeader) await this.publisher.clear(this.leaderKey);
	}

	async checkLeader() {
		const leaderId = await this.publisher.get(this.leaderKey);

		const { hostId } = this.instanceSettings;

		if (leaderId === hostId) {
			if (!this.instanceSettings.isLeader) {
				this.errorReporter.info(
					`[Instance ID ${hostId}] Remote/Local leadership mismatch, marking self as leader`,
					{
						shouldBeLogged: true,
						shouldReport: true,
					},
				);

				this.instanceSettings.markAsLeader();

				this.emit('leader-takeover');
			}

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

		const keySetSuccessfully = await this.publisher.setIfNotExists(
			this.leaderKey,
			hostId,
			this.leaderKeyTtl,
		);

		if (keySetSuccessfully) {
			this.logger.info(`[Instance ID ${hostId}] Leader is now this instance`);

			this.instanceSettings.markAsLeader();

			this.emit('leader-takeover');
		} else {
			this.instanceSettings.markAsFollower();
		}
	}

	async fetchLeaderKey() {
		return await this.publisher.get(this.leaderKey);
	}
}
