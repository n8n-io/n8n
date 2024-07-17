import type { RedisOptions } from 'ioredis';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { URL } from 'url';
import config from '@/config';

export function parseRedisUrl(): RedisOptions | null {
	const redisUri = process.env.REDIS_URL;
	if (redisUri) {
		const parsedURL = new URL(redisUri);
		Logger.debug(`Global Redis is configured`);
		return {
			host: parsedURL.hostname,
			port: parseInt(parsedURL.port),
			username: config.getEnv('queue.bull.redis.username'),
			password: parsedURL.password,
			db: config.getEnv('queue.bull.redis.db'),
		};
	} else {
		Logger.debug(`Global Redis is not configured, working with specific environment variables`);
		return null;
	}
}

export function parsePostgresUrl(): any {
	const postgresUri = process.env.DATABASE_URL;
	if (postgresUri) {
		const parsedURL = new URL(postgresUri);
		Logger.debug(`Global Postgres is configured`);
		return {
			database: parsedURL.pathname.slice(1),
			username: parsedURL.username,
			password: parsedURL.password,
			host: parsedURL.hostname,
			port: parseInt(parsedURL.port),
		};
	} else {
		Logger.debug(`Global Postgres is not configured, working with specific environment variables`);
		return null;
	}
}
