import { ApplicationError } from 'n8n-workflow';

export class UnsupportedDatabaseError extends ApplicationError {
	constructor() {
		super('Currently only sqlite is supported for benchmarking', { level: 'warning' });
	}
}
