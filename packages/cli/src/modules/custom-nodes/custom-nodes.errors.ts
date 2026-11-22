import { UserError } from '@n8n/errors';

/** Another write changed the same custom action at the same time. The client can retry. */
export class CustomNodeConflictError extends UserError {
	constructor() {
		super('Another change to this custom action was saved at the same time. Reload and try again.');
	}
}
