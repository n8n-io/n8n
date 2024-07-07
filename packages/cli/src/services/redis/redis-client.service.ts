import { Service } from 'typedi';
import config from '@/config';
import { Logger } from '@/Logger';
import ioRedis from 'ioredis';
import type { Cluster, RedisOptions } from 'ioredis';
import type { RedisClientType } from './RedisServiceBaseClasses';
import { OnShutdown } from '@/decorators/OnShutdown';
import { LOWEST_SHUTDOWN_PRIORITY } from '@/constants';

@Service()
export class RedisClientService {
	private readonly clients = new Set<ioRedis | Cluster>();

	constructor(private readonly logger: Logger) {}

	createClient(arg: { type: RedisClientType; extraOptions?: RedisOptions }) {
		const client =
			this.clusterNodes().length > 0
				? this.createClusterClient(arg)
				: this.createRegularClient(arg);

		this.clients.add(client);

		return client;
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	disconnectClients() {
		for (const client of this.clients) {
			client.disconnect();
		}
	}

	/**
	 * Ensure prefix is wrapped in curly braces for Redis cluster.
	 * See: https://github.com/OptimalBits/bull/blob/develop/PATTERNS.md
	 */
	toValidPrefix(prefix: string) {
		if (this.clusterNodes().length > 0) {
			if (!prefix.startsWith('{')) prefix = '{' + prefix;
			if (!prefix.endsWith('}')) prefix += '}';
		}

		return prefix;
	}

	// ----------------------------------
	//            private
	// ----------------------------------

	private createRegularClient({
		type,
		extraOptions,
	}: {
		type: RedisClientType;
		extraOptions?: RedisOptions;
	}) {
		const options = this.getOptions({ extraOptions });

		const { host, port } = config.getEnv('queue.bull.redis');

		options.host = host;
		options.port = port;

		this.logger.debug('[Redis] Initializing regular client', { type, host, port });

		return new ioRedis(options);
	}

	private createClusterClient({
		type,
		extraOptions,
	}: {
		type: string;
		extraOptions?: RedisOptions;
	}) {
		const options = this.getOptions({ extraOptions });

		const clusterNodes = this.clusterNodes();

		this.logger.debug('[Redis] Initializing cluster client', { type, clusterNodes });

		return new ioRedis.Cluster(clusterNodes, {
			redisOptions: options,
			clusterRetryStrategy: this.retryStrategy(),
		});
	}

	private getOptions({ extraOptions }: { extraOptions?: RedisOptions }) {
		const { username, password, db, tls } = config.getEnv('queue.bull.redis');

		/**
		 * Disabling ready check allows quick reconnection to Redis if Redis becomes
		 * temporarily unreachable. With ready check enabled, the client might take
		 * minutes to realize Redis is back up and resume working.
		 *
		 * See:
		 * - https://github.com/OptimalBits/bull/issues/890
		 * - https://github.com/OptimalBits/bull/issues/1873
		 * - https://github.com/OptimalBits/bull/pull/2185
		 */
		const options: RedisOptions = {
			username,
			password,
			db,
			enableReadyCheck: false,
			maxRetriesPerRequest: null,
			retryStrategy: this.retryStrategy(),
			...extraOptions,
		};

		if (tls) options.tls = {}; // enable TLS with default Node.js settings

		return options;
	}

	/**
	 * Strategy to retry connecting to Redis on connection failure.
	 *
	 * Try to reconnect every 500ms. On every failed attempt, increment a timeout
	 * counter - if the cumulative timeout exceeds a limit, exit the process.
	 * Reset the cumulative timeout if >30s between reconnection attempts.
	 */
	private retryStrategy() {
		const RETRY_INTERVAL = 500; // ms
		const RESET_LENGTH = 30_000; // ms
		const MAX_TIMEOUT = config.getEnv('queue.bull.redis.timeoutThreshold');

		let lastAttemptTs = 0;
		let cumulativeTimeout = 0;

		return () => {
			const nowTs = Date.now();

			if (nowTs - lastAttemptTs > RESET_LENGTH) {
				cumulativeTimeout = 0;
				lastAttemptTs = nowTs;
			} else {
				cumulativeTimeout += nowTs - lastAttemptTs;
				lastAttemptTs = nowTs;
				if (cumulativeTimeout > MAX_TIMEOUT) {
					this.logger.error(`[Redis] Unable to connect after max timeout of ${MAX_TIMEOUT} ms`);
					this.logger.error('Exiting process...');
					process.exit(1);
				}
			}

			this.logger.warn('Redis unavailable - trying to reconnect...');

			return RETRY_INTERVAL;
		};
	}

	private clusterNodes() {
		return config
			.getEnv('queue.bull.redis.clusterNodes')
			.split(',')
			.filter((pair) => pair.trim().length > 0)
			.map((pair) => {
				const [host, port] = pair.split(':');
				return { host, port: parseInt(port) };
			});
	}
}
