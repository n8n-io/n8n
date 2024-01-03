import { ApplicationError } from 'n8n-workflow';

export class NonCacheableInRedisError extends ApplicationError {
	constructor(key: string) {
		super('Value cannot be cached in Redis', { extra: { key } });
		this.level = 'warning';
	}
}
