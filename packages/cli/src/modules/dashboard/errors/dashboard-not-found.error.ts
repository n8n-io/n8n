import { UserError } from 'n8n-workflow';

export class DashboardNotFoundError extends UserError {
	constructor(dashboardId: string) {
		super(`Dashboard not found: ${dashboardId}`);
	}
}
