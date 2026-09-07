import { UserError } from 'n8n-workflow';

export class PageRouteConflictError extends UserError {
	constructor(route: string) {
		const label = route || 'the index page';
		super(`Another page at this level already uses '${label}'`, { level: 'warning' });
	}
}
