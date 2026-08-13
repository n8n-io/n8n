import { UserError } from 'n8n-workflow';

export class ProjectFileNameConflictError extends UserError {
	constructor(name: string) {
		super(`File with name '${name}' already exists in this project`, {
			level: 'warning',
		});
	}
}
