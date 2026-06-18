import { OperationalError } from 'n8n-workflow';

export class DisallowedFilepathError extends OperationalError {
	constructor(filePath: string) {
		super('Disallowed path detected', { extra: { filePath } });
	}
}
