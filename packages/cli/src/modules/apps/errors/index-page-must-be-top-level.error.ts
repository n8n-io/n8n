import { UserError } from 'n8n-workflow';

export class IndexPageMustBeTopLevelError extends UserError {
	constructor() {
		super(
			'Only a top-level page can be an index page (empty route): a sub-page with an empty route contributes no path segment, so it would resolve to the same URL as its parent page. Give it a route, or put its content on the parent page.',
			{ level: 'warning' },
		);
	}
}
