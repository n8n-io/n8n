import { UserError } from 'n8n-workflow';

export class AppNamespaceConflictError extends UserError {
	constructor(namespace: string) {
		super(`App with namespace '${namespace}' already exists in this project`, {
			level: 'warning',
		});
	}
}
