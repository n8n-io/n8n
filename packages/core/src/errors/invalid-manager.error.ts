import { UserError } from '@n8n/errors';

export class InvalidManagerError extends UserError {
	constructor(mode: string) {
		super(`No binary data manager found for: ${mode}`);
	}
}
