import { AuthError } from '@n8n/errors';

/**
 * A SAML login that can only be linked to an existing user by email, while the
 * identity provider did not confirm that email as verified. Carries the email
 * so that the login-failed audit event can name the account.
 */
export class SamlEmailNotVerifiedError extends AuthError {
	constructor(readonly email: string) {
		super('Email address is not verified by the identity provider');
	}
}
