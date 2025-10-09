import { UserError } from 'n8n-workflow';

export class NativePythonWithoutRunnerError extends UserError {
	constructor() {
		super('To use native Python, please use runners by setting `N8N_RUNNERS_ENABLED=true`.');
	}
}
