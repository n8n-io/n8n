import { UserError } from 'n8n-workflow';

export class NotStringArrayError extends UserError {
	constructor(env: string) {
		super(`${env} is not a string array.`);
	}
}
