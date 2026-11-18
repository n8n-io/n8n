import { NotFoundError } from '@n8n/errors';

export class PageNotFoundError extends NotFoundError {
	constructor() {
		super('Page not found');
	}
}
