import type { CredentialOAuthContext } from '../../schemas/credential-oauth.schema';

/**
 * Authorization metadata surfaced on credential responses. The connectedByMe,
 * account identifier, and user count fields apply only to private credentials.
 */
export interface CredentialConnectionStatus {
	/** Authorization state for OAuth credentials that require interactive sign-in. */
	oauthContext?: CredentialOAuthContext;
	connectedByMe?: boolean;
	/**
	 * The provider account the requesting user's own connection authenticates as
	 * (e.g. the connected Gmail address). Undefined when the provider returns no
	 * identity claim, which is common — never fall back to the n8n account here.
	 */
	connectedAccountIdentifier?: string;
	/** Total number of users who have a per-user entry for this credential. */
	connectedUserCount?: number;
}
