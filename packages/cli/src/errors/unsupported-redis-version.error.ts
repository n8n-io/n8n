import { ApplicationError } from 'n8n-workflow';

export class UnsupportedRedisVersionError extends ApplicationError {
	constructor(version: string) {
		super('Found unsupported Redis version. Minimum required version is 5.0.0.', {
			extra: { version },
		});
	}
}
