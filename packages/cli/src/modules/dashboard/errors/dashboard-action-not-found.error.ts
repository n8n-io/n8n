import { UserError } from 'n8n-workflow';

export class DashboardActionNotFoundError extends UserError {
	constructor(slug: string) {
		super(`Dashboard action not found: ${slug}`);
	}
}
