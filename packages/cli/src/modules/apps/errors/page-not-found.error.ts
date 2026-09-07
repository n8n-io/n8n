import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class PageNotFoundError extends NotFoundError {
	constructor(pageId: string) {
		super(`Could not find the page: '${pageId}'`);
	}
}
