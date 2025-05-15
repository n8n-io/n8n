import { UnexpectedError } from 'n8n-workflow';

export class NotBaseEntityError extends UnexpectedError {
	constructor(className: string) {
		super(`Entity ${className} must extend BaseEntity`);
	}
}
