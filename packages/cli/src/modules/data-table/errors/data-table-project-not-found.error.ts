import { NotFoundError } from '@n8n/errors';

export class DataTableProjectNotFoundError extends NotFoundError {
	constructor(readonly projectId: string) {
		super(`Could not find project with ID: ${projectId}`);
	}
}
