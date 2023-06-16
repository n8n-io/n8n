import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import config from '@/config';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { EVENT_BUS_REDIS_CHANNEL } from '../eventbus/MessageEventBus/MessageEventBusHelper';
import type { AbstractEventMessage } from '../eventbus/EventMessageClasses/AbstractEventMessage';

@Service()
export class RedisService {
	static redisClient: Redis | undefined;

	static messageHandlers: Map<string, (channel: string, message: string) => void> = new Map();

	static isInitialized = false;

	async init(): Promise<Redis> {
		if (RedisService.redisClient && RedisService.isInitialized) {
			return RedisService.redisClient;
		}

		let lastTimer = 0;
		let cumulativeTimeout = 0;

		const { host, port, username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
		const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');

		RedisService.redisClient = new Redis({
			host,
			port,
			db,
			username,
			password,
			retryStrategy: (): number | null => {
				const now = Date.now();
				if (now - lastTimer > 30000) {
					// Means we had no timeout at all or last timeout was temporary and we recovered
					lastTimer = now;
					cumulativeTimeout = 0;
				} else {
					cumulativeTimeout += now - lastTimer;
					lastTimer = now;
					if (cumulativeTimeout > redisConnectionTimeoutLimit) {
						Logger.error(
							`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
						);
						process.exit(1);
					}
				}
				return 500;
			},
		});

		RedisService.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisService.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		// TODO: Debug Redis messages, remove at some point...
		RedisService.messageHandlers.set('default', (channel: string, message: string) => {
			Logger.debug(`Redis received ${message} from ${channel}`);
		});

		RedisService.redisClient.on('message', (channel: string, message: string) => {
			RedisService.messageHandlers.forEach((handler) => handler(channel, message));
		});

		return RedisService.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisService.redisClient) {
			return;
		}
		await RedisService.redisClient.quit();
		RedisService.redisClient = undefined;
	}

	async subscribe(channel: string): Promise<void> {
		if (!RedisService.redisClient) {
			await this.init();
		}
		await RedisService.redisClient?.subscribe(channel, (error, count: number) => {
			if (error) {
				Logger.error('Error subscribing to eventlog channel');
			} else {
				Logger.debug(`Subscribed ${count.toString()} to eventlog channel`);
			}
		});
	}

	async publish(channel: string, message: string): Promise<void> {
		if (!RedisService.redisClient) {
			await this.init();
		}
		await RedisService.redisClient?.publish(channel, message);
	}

	async subscribeToEventLog(): Promise<void> {
		await this.subscribe(EVENT_BUS_REDIS_CHANNEL);
	}

	async publishToEventLog(message: AbstractEventMessage): Promise<void> {
		await this.publish(EVENT_BUS_REDIS_CHANNEL, message.toString());
	}
}
