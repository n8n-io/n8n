import { ResponseError } from '@n8n/errors';

/**
 * A node package declares a credential type that another loaded package already
 * provides. Credential types share one flat namespace, so the second definition
 * would silently replace the first.
 */
export class CredentialTypeConflictError extends ResponseError {
	constructor(
		readonly packageName: string,
		/** Credential type name mapped to the package that already provides it. */
		readonly conflicts: Record<string, string>,
	) {
		const details = Object.entries(conflicts)
			.map(([credentialType, owner]) => `"${credentialType}" (provided by "${owner}")`)
			.join(', ');

		super(
			`Package "${packageName}" cannot be loaded. It declares credential types that already exist: ${details}. Ask the package author to rename them.`,
			400,
		);
		this.name = 'CredentialTypeConflictError';
	}
}
