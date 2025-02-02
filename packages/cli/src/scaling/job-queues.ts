import { Service } from '@n8n/di';
import { JobQueue } from './scaling.types';
import BullQueue from 'bull';
import { RedisClientService } from '@/services/redis-client.service';
import { Logger } from 'n8n-core';
import { GlobalConfig } from '@n8n/config';

@Service()
export class JobQueues {
	private queues: {
		[key: string]: JobQueue;
	} = {};

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly redisClientService: RedisClientService,
	) {}

	assertQueue(key: string, name: string) {
		const {
			bull: { prefix: bullPrefix, settings },
		} = this.globalConfig.queue;
		const prefix = this.redisClientService.toValidPrefix(bullPrefix);
		this.queues[key] = new BullQueue(name, {
			prefix,
			settings,
			createClient: (type) => this.redisClientService.createClient({ type: `${type}(bull)` }),
		});
		this.logger.info(`Queue setup: ${key}`);
	}

	getQueue(key?: string) {
		return (key ? this.queues[key] : undefined) ?? this.queues.default;
	}

	getAllQueues() {
		return Object.values(this.queues);
	}
}
