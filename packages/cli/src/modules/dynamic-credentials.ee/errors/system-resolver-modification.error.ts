import { UserError } from 'n8n-workflow';

/**
 * Thrown when a public CRUD caller attempts to PATCH or DELETE the system-managed
 * N8N self-connect resolver. The controller maps this to a 400 BadRequest.
 */
export class SystemResolverModificationError extends UserError {
	constructor(action: 'update' | 'delete') {
		super(`Cannot ${action} the system credential resolver.`);
	}
}
