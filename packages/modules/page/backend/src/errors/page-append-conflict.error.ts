import { ConflictError } from '@n8n/errors';

/** Other writers saved the page before each attempt of an append. */
export class PageAppendConflictError extends ConflictError {
	constructor(meta: { pageId: string; attempts: number }) {
		super('The page changed too often to append to it', undefined, meta);
	}
}
