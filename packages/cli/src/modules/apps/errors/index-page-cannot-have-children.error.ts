import { UserError } from 'n8n-workflow';

export class IndexPageCannotHaveChildrenError extends UserError {
	constructor(pageId: string) {
		super(
			`Page '${pageId}' is an index page (empty route) and can't have sub-pages: a child page would resolve to the exact same URL as a sibling of this page, since the index page itself contributes no path segment.`,
			{ level: 'warning' },
		);
	}
}
