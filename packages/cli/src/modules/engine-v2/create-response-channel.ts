import { Logger } from '@n8n/backend-common';
import { EngineConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	ExecutionResponseChannel,
	InMemoryResponseTransport,
	RedisResponseTransport,
} from '@n8n/engine';
import type { ResponseTransport } from '@n8n/engine';

import { RedisClientService } from '@/services/redis-client.service';

const CHANNEL_PREFIX = 'engine-v2-responses';

/**
 * Builds the one channel both planes use.
 *
 * The only place that knows a transport has variants. Everything above this
 * sees one `ExecutionResponseChannel`, whether the data plane is in this
 * process or in another container.
 */
@Service()
export class ResponseChannelFactory {
	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly redisClientService: RedisClientService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	create(): ExecutionResponseChannel {
		return new ExecutionResponseChannel(this.transport(), this.logger);
	}

	private transport(): ResponseTransport {
		if (this.engineConfig.responseTransport !== 'redis') {
			return new InMemoryResponseTransport();
		}

		return new RedisResponseTransport({
			// Separate clients: a subscribed connection accepts no other command.
			publisher: this.redisClientService.createClient({ type: 'publisher(n8n)' }),
			subscriber: this.redisClientService.createClient({ type: 'subscriber(n8n)' }),
			// Prefixed, so two deployments on one Redis do not read each other's
			// responses. One channel per execution hangs off this.
			channelPrefix: `${this.globalConfig.redis.prefix}:${CHANNEL_PREFIX}`,
			logger: this.logger,
		});
	}
}
