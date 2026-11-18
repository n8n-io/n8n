import { BadRequestError } from '@n8n/errors';

export class PageContentTooLongError extends BadRequestError {
	constructor() {
		super('The page content is too long');
	}
}
