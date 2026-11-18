import { NotFoundError } from '@n8n/errors';

export class PageProjectNotFoundError extends NotFoundError {
	constructor() {
		super('Project not found');
	}
}
