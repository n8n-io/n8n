import { ApplicationError } from 'n8n-workflow';

export class UnusableDisabledCacheError extends ApplicationError {
	constructor(key: string | string[]) {
		super('Cache is disabled and no refresh function was provided', { extra: { key } });
	}
}
