import { ConflictError } from '@n8n/errors';

export type PageVersionConflict = { pageId: string; baseVersion: number; currentVersion: number };

/** The client edited a version of the page that is no longer the stored one. */
export class PageVersionConflictError extends ConflictError {
	constructor(conflict: PageVersionConflict) {
		super('The page changed after you opened it', undefined, conflict);
	}
}
