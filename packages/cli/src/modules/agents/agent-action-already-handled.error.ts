import { UserError } from 'n8n-workflow';

/**
 * An earlier click or resume took this action while this one waited for the
 * thread turn. Expected on repeated clicks, so callers answer the user
 * instead of reporting a failure.
 */
export class AgentActionAlreadyHandledError extends UserError {
	constructor() {
		super('This action has already been handled', { level: 'info' });
	}
}
