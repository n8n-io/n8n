import type { RedisOptions } from 'ioredis';
import { URL } from 'url';
import config from '@/config';

export function parseRedisUrl(): RedisOptions | null{
	const redisUri = process.env.REDIS_URI;
	if (redisUri) {
		const parsedURL = new URL(redisUri);
		return {
			host: parsedURL.hostname,
			port: parseInt(parsedURL.port),
			password: parsedURL.password,
			db: config.getEnv('queue.bull.redis.db')
		}
	} else {
		return null;
	}
}

export function parsePostgresUrl(): any {
	const postgresUri = process.env.DATABASE_URL;
	if (postgresUri) {
		const parsedURL = new URL(postgresUri);
		return {
			host: parsedURL.hostname,
			port: parseInt(parsedURL.port),
			username: parsedURL.username,
			password: parsedURL.password,
			database: parsedURL.pathname.slice(1)
		}
	} else {
		return null;
	}
}