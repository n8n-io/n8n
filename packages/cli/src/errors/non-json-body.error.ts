import { ApplicationError } from 'n8n-workflow';

export class NonJsonBodyError extends ApplicationError {
	constructor() {
		super('Body must be valid JSON. Please make sure `content-type` is `application/json`.');
	}
}
