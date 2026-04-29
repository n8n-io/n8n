import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Debounce } from '@n8n/decorators';
import { Service } from '@n8n/di';
import ioRedis from 'ioredis';
import type { Cluster, ClusterOptions, RedisOptions } from 'ioredis';

import { TypedEmitter } from '@/typed-emitter';

import type { RedisClientType } from '../scaling/redis/redis.types';

type RedisEventMap = {
	'connection-lost': number;
	'connection-recovered': never;
};

/** Function called by ioredis on each failed reconnect. Returns ms to wait before the next attempt. */
type RetryStrategy = () => number;

type RedisClientCreateOptions = {
	type: RedisClientType;
	extraOptions?: RedisOptions;
};

const RECONNECT_AND_RETRY = 2;
const DO_NOT_RECONNECT = false;

@Service()
export class RedisClientService extends TypedEmitter<RedisEventMap> {
	private readonly clients = new Set<ioRedis | Cluster>();

	private readonly config = {
		/** How long (in ms) to try to reconnect for before exiting. */
		maxTimeout: this.globalConfig.queue.bull.redis.timeoutThreshold,

		/** How long (in ms) to wait between reconnection attempts. */
		retryInterval: 1000,

		/** How long (in ms) to wait before resetting the cumulative timeout. */
		resetLength: 30_000,
	};

	/** Whether any client has lost connection to Redis. */
	private lostConnection = false;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {
		super();

		this.logger = this.logger.scoped(['redis', 'scaling']);

		this.registerListeners();
	}

	isConnected() {
		return !this.lostConnection;
	}

	createClient(options: RedisClientCreateOptions) {
		const { retryStrategy, resetRetryState } = this.makeRetryStrategy();

		const client =
			this.clusterNodes().length > 0
				? this.createClusterClient(options, retryStrategy)
				: this.createRegularClient(options, retryStrategy);

		client.on('error', (error: Error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return; // handled by retryStrategy

			this.logger.error(`[Redis client] ${error.message}`, { error });
		});

		client.on('ready', () => {
			resetRetryState();
			if (this.lostConnection) {
				this.emit('connection-recovered');
				this.lostConnection = false;
			}
		});

		this.clients.add(client);

		return client;
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

	private createRegularClient(
		{ type, extraOptions }: RedisClientCreateOptions,
		retryStrategy: RetryStrategy,
	) {
		const options = this.getOptions({ extraOptions, retryStrategy });

		const { host, port } = this.globalConfig.queue.bull.redis;

		options.host = host;
		options.port = port;

		const client = new ioRedis(options);

		this.logger.debug(`Started Redis client ${type}`, { type, host, port });

		return client;
	}

	private createClusterClient(
		{ type, extraOptions }: RedisClientCreateOptions,
		retryStrategy: RetryStrategy,
	) {
		const options = this.getOptions({ extraOptions, retryStrategy });

		const clusterNodes = this.clusterNodes();

		const clusterOptions = this.getClusterOptions(options, retryStrategy);

		const clusterClient = new ioRedis.Cluster(clusterNodes, clusterOptions);

		this.logger.debug(`Started Redis cluster client ${type}`, { type, clusterNodes });

		return clusterClient;
	}

	private getOptions({
		extraOptions,
		retryStrategy,
	}: {
		extraOptions?: RedisOptions;
		retryStrategy: RetryStrategy;
	}) {
		const {
			username,
			password,
			db,
			tls,
			dualStack,
			keepAlive,
			keepAliveDelay,
			keepAliveInterval,
			reconnectOnFailover,
		} = this.globalConfig.queue.bull.redis;

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
			retryStrategy,
			...extraOptions,
		};

		if (dualStack) options.family = 0;

		if (tls) options.tls = {}; // enable TLS with default Node.js settings

		// Add keep-alive configuration
		if (keepAlive) {
			options.keepAlive = keepAliveDelay;
			// @ts-expect-error: keepAliveInterval is missing in ioRedis types but supported in node js socket since v18.4.0
			options.keepAliveInterval = keepAliveInterval;
		}

		if (reconnectOnFailover) {
			options.reconnectOnError = (redisErr: Error) => {
				const targetError = 'READONLY';
				if (redisErr.message.includes(targetError)) {
					this.logger.warn('Reconnecting to Redis due to READONLY error (possible failover event)');
					return RECONNECT_AND_RETRY;
				}
				return DO_NOT_RECONNECT;
			};
		}

		return options;
	}

	private getClusterOptions(options: RedisOptions, retryStrategy: RetryStrategy): ClusterOptions {
		const { slotsRefreshTimeout, slotsRefreshInterval, dnsResolveStrategy } =
			this.globalConfig.queue.bull.redis;
		const clusterOptions: ClusterOptions = {
			redisOptions: options,
			clusterRetryStrategy: retryStrategy,
			slotsRefreshTimeout,
			slotsRefreshInterval,
		};

		// NOTE: this is necessary to use AWS Elasticache Clusters with TLS.
		// See https://github.com/redis/ioredis?tab=readme-ov-file#special-note-aws-elasticache-clusters-with-tls.
		if (dnsResolveStrategy === 'NONE') {
			clusterOptions.dnsLookup = (address, lookupFn) => lookupFn(null, address);
		}

		return clusterOptions;
	}

	/**
	 * Builds a per-client retry strategy and reset hook.
	 *
	 * On every failed attempt, increment a timeout counter - if the cumulative
	 * timeout exceeds a limit, exit the process. Reset the cumulative timeout
	 * on successful reconnect or if >30s between reconnection attempts.
	 */
	private makeRetryStrategy(): { retryStrategy: RetryStrategy; resetRetryState: () => void } {
		let lastAttemptTs = 0;
		let cumulativeTimeout = 0;

		const retryStrategy: RetryStrategy = () => {
			const nowTs = Date.now();

			if (nowTs - lastAttemptTs > this.config.resetLength) {
				cumulativeTimeout = 0;
				lastAttemptTs = nowTs;
			} else {
				cumulativeTimeout += nowTs - lastAttemptTs;
				lastAttemptTs = nowTs;
				if (cumulativeTimeout > this.config.maxTimeout) {
					const maxTimeout = Math.round(this.config.maxTimeout / 1000) + 's';
					this.logger.error(`Unable to connect to Redis after trying to connect for ${maxTimeout}`);
					this.logger.error('Exiting process due to Redis connection error');
					process.exit(1);
				}
			}

			this.lostConnection = true;
			this.emit('connection-lost', cumulativeTimeout);

			return this.config.retryInterval;
		};

		const resetRetryState = () => {
			lastAttemptTs = 0;
			cumulativeTimeout = 0;
		};

		return { retryStrategy, resetRetryState };
	}

	private clusterNodes() {
		return this.globalConfig.queue.bull.redis.clusterNodes
			.split(',')
			.filter((pair) => pair.trim().length > 0)
			.map((pair) => {
				const [host, port] = pair.split(':');
				return { host, port: parseInt(port) };
			});
	}

	@Debounce(1000)
	emit<Event extends keyof RedisEventMap>(
		event: Event,
		...args: Array<RedisEventMap[Event]>
	): boolean {
		return super.emit(event, ...args);
	}

	private registerListeners() {
		const { maxTimeout: maxTimeoutMs, retryInterval: retryIntervalMs } = this.config;

		const retryInterval = this.formatTimeout(retryIntervalMs);
		const maxTimeout = this.formatTimeout(maxTimeoutMs);

		this.on('connection-lost', (cumulativeTimeoutMs) => {
			const cumulativeTimeout = this.formatTimeout(cumulativeTimeoutMs);
			const reconnectionMsg = `Trying to reconnect in ${retryInterval}...`;
			const timeoutDetails = `${cumulativeTimeout}/${maxTimeout}`;

			this.logger.warn(`Lost Redis connection. ${reconnectionMsg} (${timeoutDetails})`);
		});

		this.on('connection-recovered', () => {
			this.logger.info('Recovered Redis connection');
		});
	}

	private formatTimeout(timeoutMs: number) {
		const timeoutSeconds = timeoutMs / 1000;
		const roundedTimeout = Math.round(timeoutSeconds * 10) / 10;

		return roundedTimeout + 's';
	}
}
