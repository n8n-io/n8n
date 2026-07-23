import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import ioRedis from 'ioredis';

export const redisConfig = Container.get(GlobalConfig).queue.bull.redis;

export async function isRedisAvailable(): Promise<boolean> {
	const { host, port, username, password, db, tls } = redisConfig;
	const client = new ioRedis({
		host,
		port,
		username: username || undefined,
		password: password || undefined,
		db,
		tls: tls ? {} : undefined,
		connectTimeout: 1000,
		maxRetriesPerRequest: 1,
		retryStrategy: () => null,
	});

	try {
		await client.ping();
		await client.quit();
		return true;
	} catch {
		client.disconnect();
		return false;
	}
}
