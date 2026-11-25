import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const authenticationMethod = z
	.enum(['email', 'ldap', 'saml', 'oidc', 'token-exchange'])
	.describe(
		'How the user proved their identity. `token-exchange` is the session type of the embedded editor, which reports its own events',
	);

export const AUTH_TELEMETRY = defineTelemetryEvents({
	USER_ENABLED_MFA: {
		name: 'User enabled MFA',
		description:
			'A user turned on MFA for their own account. The instance reports it after the user confirms a code from their authenticator app. This includes a setup that MFA enforcement asks for.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
	USER_DISABLED_MFA: {
		name: 'User disabled MFA',
		description:
			'A user turned off MFA for their own account, with a code from their authenticator app or a recovery code. The `n8n mfa:disable` CLI command does not report this event.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
	USER_LOGGED_OUT: {
		name: 'User logged out',
		description:
			'A user signed out of n8n through the sign-out endpoint or the OIDC sign-out endpoint. This includes sign-outs that the editor starts itself, for example after a user sets up MFA that the instance enforces. A session that expires, or that the instance stops accepting after a password, email or MFA change, does not report this event.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
	USER_LOGGED_IN: {
		name: 'User logged in',
		description:
			'A user signed in to n8n with email and password, through LDAP, or through SAML or OIDC single sign-on. The instance reports it once the session cookie is issued. A sign-in to the embedded editor through token exchange reports `Embed login succeeded` instead. The browser event `User attempted to login` stays as it is and only sees password sign-ins.',
		properties: z.object({
			user_id: z.string(),
			authentication_method: authenticationMethod,
			used_mfa: z
				.boolean()
				.describe(
					'True when n8n verified an MFA code or a recovery code during this sign-in. False for single sign-on, where the identity provider owns MFA',
				),
		}),
	},
	USER_LOGIN_FAILED: {
		name: 'User login failed',
		description:
			'A sign-in attempt was refused: wrong credentials, a rejected MFA code, a password sign-in that the instance blocks because SSO is enforced, or a SAML or OIDC callback that did not authenticate a user. The instance reports the method and a bounded reason, never the email or the password that was tried. The audit event `n8n.audit.user.login.failed` keeps the free-text reason.',
		properties: z.object({
			authentication_method: authenticationMethod,
			reason: z
				.enum([
					'wrong_credentials',
					'mfa_rejected',
					'sso_login_required',
					'email_not_verified',
					'access_denied',
					'authentication_failed',
					'provider_error',
					'other',
				])
				.describe(
					'`access_denied`: the SSO role mapping grants no access. `authentication_failed`: the SAML response named no user. `provider_error`: the OIDC provider answered the callback with an error. `other`: any other SSO failure',
				),
		}),
	},
});
