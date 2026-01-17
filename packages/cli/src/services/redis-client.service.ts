import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
enableRedisDebug();
import { Debounce } from '@n8n/decorators';
import { Service } from '@n8n/di';
import dns from 'dns';
import { readFileSync } from 'fs';
import ioRedis from 'ioredis';
import type { Cluster, ClusterOptions, DNSLookupFunction, RedisOptions } from 'ioredis';
import { InstanceSettings } from 'n8n-core';
import { isAbsolute } from 'path';

import type { RedisClientType } from '../scaling/redis/redis.types';

import { TypedEmitter } from '@/typed-emitter';

type RedisEventMap = {
	['connection-lost']: number;
	['connection-recovered']: never;
};

type RedisNode = Array<{
	host: string;
	port: number;
}>;

type CreateRedisClientArgs = { type: RedisClientType; extraOptions?: RedisOptions };

/**
 * Enable ioredis debug logging if QUEUE_BULL_REDIS_DEBUG is set to 'true'.
 * Based on npm package 'debug', setting the DEBUG env var to 'ioredis:*' enables logging.
 * Must be called before any ioredis module is loaded to take effect.
 * @see
 */
function enableRedisDebug() {
	const debug = process.env.QUEUE_BULL_REDIS_DEBUG === 'true';
	if (debug) {
		// get existing DEBUG namespaces and add 'ioredis:* debug option'"
		const debuggers = (process.env.DEBUG ?? '')
			.split(',')
			.map((d) => d.trim())
			.filter((d) => d && !d.includes('ioredis'));
		debuggers.push('ioredis:*');
		process.env['DEBUG'] = debuggers.join(',');
	}
}

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
		private readonly instanceSettings: InstanceSettings,
	) {
		super();

		this.logger = this.logger.scoped(['redis', 'scaling']);

		this.registerListeners();
	}

	isConnected() {
		return !this.lostConnection;
	}

	createClient(arg: CreateRedisClientArgs) {
		const options = this.getOptions(arg);
		const isCluster = this.clusterNodes().length > 0;
		const { client, nodes } = isCluster
			? this.createClusterClient(options)
			: this.createRegularClient(options);

		client.on('error', (error: Error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return; // handled by retryStrategy
			this.logger.error(`[Redis client] ${error.message}`, { error });
		});

		client.on('ready', () => {
			if (this.lostConnection) {
				this.emit('connection-recovered');
				this.lostConnection = false;
			}
		});

		this.clients.add(client);

		this.connect(client, isCluster, arg.type, nodes);

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

	private createRegularClient(options: RedisOptions) {
		const { host, port } = this.globalConfig.queue.bull.redis;

		options.host = host;
		options.port = port;

		const client = new ioRedis(options);

		return { client, nodes: [{ host, port }] };
	}

	private createClusterClient(options: RedisOptions) {
		const nodes = this.clusterNodes();

		const clusterNodes = this.clusterNodes();

		const clusterOptions = this.getClusterOptions(options, this.retryStrategy());

		const client = new ioRedis.Cluster(clusterNodes, clusterOptions);

		return { client, nodes };
	}

	private getOptions({ type, extraOptions }: CreateRedisClientArgs) {
		const redisConfig = this.globalConfig.queue.bull.redis;
		const { username, password, db, tls, tlsConfig, enableAutoPipelining } = redisConfig;

		// Support all IPv4/IPv6 DNS lookup variants. Defaults to IPv4. Backward compatible with DUALSTACK option.
		const getHostnameResolutionIpAddressFamily = (): 0 | 4 | 6 => {
			const { dualStack, ipV6 } = redisConfig;
			if (dualStack && ipV6) this.exitWithError('Set only one redis option: DUALSTACK or IPV6.');
			if (ipV6) return 6;
			if (dualStack) return 0;
			return 4;
		};

		/**
		 * Disabling ready check allows quick reconnection to Redis if Redis becomes
		 * temporarily unreachable. With ready check enabled, the client might take
		 * minutes to realize Redis is back up and resume working.
		 *
		 * See:
		 * - https://github.com/OptimalBits/bull/issues/890
		 * - https://github.com/OptimalBits/bull/issues/1873
		 * - https://github.com/OptimalBits/bull/pull/2185
		 *
		 * Set lazyConnect=true so that connection is established on first redis command.
		 * Once client and listeners are set up, we call client.connect() once with retry strategy enabled.
		 * By calling connect() explicitly errors can be logged that ioredis is hiding when auto connecting.
		 *
		 * @todo Test enableAutoPipelining for performance impact on high load deployments. Maybe remove later if no acceleration provable.
		 * @see https://github.com/redis/ioredis?tab=readme-ov-file#autopipelining
		 */
		const options: RedisOptions = {
			username,
			password,
			connectionName: `${this.instanceSettings.hostId}:${type}`,
			db,
			enableReadyCheck: false,
			lazyConnect: true,
			maxRetriesPerRequest: null,
			enableAutoPipelining,
			family: getHostnameResolutionIpAddressFamily(),
			retryStrategy: this.retryStrategy(),
			reconnectOnError: this.onReconnectError,
			...extraOptions,
		};

		const {
			caFile,
			certFile,
			certKeyFile,
			certKeyFilePassphrase = undefined,
			serverName = undefined,
			rejectUnauthorized,
		} = tlsConfig;

		if (tls) {
			options.tls = {
				ca: caFile ? this.readTlsFileSync(caFile) : undefined,
				cert: certFile ? this.readTlsFileSync(certFile) : undefined,
				key: certKeyFile ? this.readTlsFileSync(certKeyFile) : undefined,
				enableTrace: false,
				passphrase: certKeyFilePassphrase,
				servername: serverName,
				rejectUnauthorized: rejectUnauthorized ? undefined : false,
			};
		} else if ([caFile, certFile, certKeyFile, serverName, !rejectUnauthorized].some((v) => v)) {
			// To be backward compatible tls=true still works and tlsConfig={} was added to set TLS options.
			// In case tlsConfig is set but tls=false (default) we error out to avoid confusion.
			this.exitWithError('Redis TLS disabled but config found. Set QUEUE_BULL_REDIS_TLS=true.');
		}

		return options;
	}

	/*
	 * Read TLS certificate files synchronously once on client creation with graceful error handling.
	 */
	private readTlsFileSync = (path: string) => {
		try {
			if (!isAbsolute(path)) {
				this.exitWithError(`Redis TLS file path is not absolute: ${path}`);
			}
			return readFileSync(path).toString('utf-8');
		} catch (e) {
			this.exitWithError(`Error reading Redis TLS file: ${path}`, e as Error);
		}
		return '';
	};

	/**
	 * DNS lookups for redis hostnames to specific IPs can be error prone with TLS and require different resolution strategies.
	 * Both IPv4 and IPv6 addresses or only IPv6 addresses may resolve, while ioredis defaults to only support IPv4.
	 * The TLS certificate presented by either server or client (mtls) may not match all resolved IP addresses or hostnames.
	 * Especially AWS Elasticache cluster connections often lead to invalid certificate errors due to certificate hostname/ip mismatches.
	 * @see https://github.com/redis/ioredis?tab=readme-ov-file#special-note-aws-elasticache-clusters-with-tls
	 */
	private getDnsLookupFunction =
		(family: number, strategy: 'LOOKUP' | 'NONE' | 'UNKNOWN'): DNSLookupFunction =>
		(address, resolve) => {
			this.logger.debug(
				`Redis DNS lookup: strategy=${strategy} address=${address} family=${family}`,
			);
			if (strategy === 'LOOKUP') {
				// Use default dns.lookup which ioredis also uses internally.
				dns.lookup(address, { family }, resolve);
			} else if (strategy === 'NONE') {
				// resolve to original hostname without DNS resolution
				resolve(null, address);
			} else {
				this.exitWithError(
					`Invalid DNS lookup strategy: ${strategy}. Valid are 'LOOKUP' or 'NONE'.`,
				);
			}
		};

	/**
	 * Connect to Redis clients once after setup and log any initial connection error.
	 * Subsequent reconnection attempts are handled by ioredis with retry strategy.
	 */
	private connect = (
		client: Cluster | ioRedis,
		isCluster: boolean,
		type: string,
		nodes: RedisNode,
	) => {
		const clientName = isCluster ? 'Redis cluster client' : 'Redis client';

		if (client.status !== 'wait') {
			this.logger.warn(`${clientName} already connected ${type}`, { type, nodes });
			return;
		}

		this.logger.debug(`Connecting ${clientName} ${type}`, { type, nodes });
		client
			.connect()
			.then(() => {
				this.logger.info(`${clientName} connected ${type}`, { type, nodes });
			})
			.catch((error) => {
				this.logger.error(`${clientName} connection failed: ${error}`, { error });
			});
	};

	/**
	 * Log any reconnection errors to surface helpful network or TLS errors. Return true to reconnect.
	 * Does not always work because some redis servers just close connections without responding error messages.
	 */
	private onReconnectError = (error: Error) => {
		this.logger.error(`Redis onReconnectError: ${error.message}`, { error });
		return true;
	};

	private exitWithError(message: string, error?: Error) {
		this.logger.error(message, { error });
		process.exit(1);
	}

	private getClusterOptions(
		options: RedisOptions,
		retryStrategy: () => number | null,
	): ClusterOptions {
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
	 * Strategy to retry connecting to Redis on connection failure.
	 *
	 * Try to reconnect every 500ms. On every failed attempt, increment a timeout
	 * counter - if the cumulative timeout exceeds a limit, exit the process.
	 * Reset the cumulative timeout if >30s between reconnection attempts.
	 */
	private retryStrategy() {
		let lastAttemptTs = 0;
		let cumulativeTimeout = 0;

		return () => {
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
					this.exitWithError('Exiting process due to Redis connection error');
				}
			}

			this.emit('connection-lost', cumulativeTimeout);

			return this.config.retryInterval;
		};
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

			this.lostConnection = true;
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
