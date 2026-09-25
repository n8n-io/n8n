import { CredentialResolutionError } from './credential-resolution.error';

/**
 * Thrown when an n8n session identity is offered to a resolver that keys on an
 * external subject (OAuth introspection, Slack). Those resolvers treat the context
 * identity as a token issued by *their* provider, so passing an n8n session token
 * would both fail and send that token to a third party.
 */
export class N8nIdentityNotSupportedError extends CredentialResolutionError {
	constructor(credentialName: string) {
		super(
			`"${credentialName}" resolves credentials per external user, so it can only be resolved by a request carrying that user's token`,
		);
		this.name = 'N8nIdentityNotSupportedError';
	}
}
