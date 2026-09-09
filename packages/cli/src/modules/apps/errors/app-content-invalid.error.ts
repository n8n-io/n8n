import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/** One draft page's content does not match `appContentSchema`. */
export type InvalidPageContent = { pageId: string; issues: unknown };

/** Thrown by publish when any draft page's content fails schema validation. */
export class AppContentInvalidError extends BadRequestError {
	constructor(readonly meta: { pages: InvalidPageContent[] }) {
		super("This app's draft content does not match the block schema; fix it before publishing.");
		this.name = 'AppContentInvalidError';
	}
}
