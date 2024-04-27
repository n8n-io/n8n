import { ApplicationError } from 'n8n-workflow';

export class DuplicateSuiteError extends ApplicationError {
	constructor(key: string) {
		super(`Duplicate suite found at \`${key}\`. Please define a single suite for this file.`, {
			level: 'warning',
		});
	}
}
