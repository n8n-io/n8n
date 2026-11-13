import { UserError } from '@n8n/errors';

/**
 * The trigger nodes of a version use a credential that its publisher cannot use.
 * The check runs before registration, so the rollback has nothing to tear down.
 */
export class TriggerCredentialAccessError extends UserError {
	constructor(cause: UserError) {
		super(cause.message, { cause, description: cause.description });
	}
}
