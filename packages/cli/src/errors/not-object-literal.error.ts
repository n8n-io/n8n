import { ApplicationError } from 'n8n-workflow';

export class NotObjectLiteralError extends ApplicationError {
	constructor(value: unknown) {
		super(`Expected object literal but found ${typeof value}`, {
			extra: { value },
			level: 'warning',
		});
	}
}
