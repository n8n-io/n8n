import { UnexpectedError } from '@n8n/errors';

export class MissingSourceIdError extends UnexpectedError {
	constructor(pathSegments: string[]) {
		super(`Custom file location missing sourceId: ${pathSegments.join('/')}`);
	}
}
