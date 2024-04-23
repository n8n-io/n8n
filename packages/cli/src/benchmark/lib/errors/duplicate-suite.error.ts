import { ApplicationError } from 'n8n-workflow';

export class DuplicateSuiteError extends ApplicationError {
	constructor(filePath: string) {
		super(`Duplicate suite found at \`${filePath}\`. Please define a single suite for this file.`, {
			level: 'warning',
		});
	}
}
