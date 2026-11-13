import { UserError } from 'n8n-workflow';

/**
 * The nodes of a workflow use a credential that its projects cannot use.
 * The check runs before registration, so the rollback has nothing to tear down.
 */
export class TriggerCredentialAccessError extends UserError {
	constructor(cause: UserError) {
		super(cause.message, { cause, description: cause.description });
	}
}
