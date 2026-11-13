import { UserError } from '@n8n/errors';

export class DisallowedFilepathError extends UserError {
	constructor(filePath: string) {
		super('Disallowed path detected', { extra: { filePath } });
	}
}
