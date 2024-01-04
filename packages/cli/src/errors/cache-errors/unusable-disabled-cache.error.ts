import { ApplicationError } from 'n8n-workflow';

export class UnusableDisabledCacheError extends ApplicationError {
	constructor() {
		super('Cache is disabled and no refresh function was provided');
	}
}
