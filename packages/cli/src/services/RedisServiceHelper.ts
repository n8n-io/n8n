import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import config from '@/config';
import { LoggerProxy as Logger } from 'n8n-workflow';

export const EVENT_BUS_REDIS_CHANNEL = 'n8n.events';
export const COMMAND_REDIS_CHANNEL = 'n8n.commands';

export const getRedisClient = async (): Promise<Redis> => {
	let lastTimer = 0;
	let cumulativeTimeout = 0;

	const { host, port, username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
	const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');

	return new Redis({
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
};
