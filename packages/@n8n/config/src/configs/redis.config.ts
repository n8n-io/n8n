import { Config, Env } from '../decorators';

@Config
export class RedisConfig {
	/** Key prefix for all Redis keys used by n8n (avoids clashes when sharing a Redis instance). */
	@Env('N8N_REDIS_KEY_PREFIX')
	prefix: string = 'n8n';
}
