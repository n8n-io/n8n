import { ApplicationError } from 'n8n-workflow';

export class NotStringArrayError extends ApplicationError {
	constructor(env: string) {
		super(`${env} is not a string array.`);
	}
}
