import type { AuthPrincipal } from './types.ee';

export type PrincipalType = 'human' | 'service';

/** The resolved caller. One per party. Structurally an AuthPrincipal, so every scope check accepts it unchanged. */
export type Principal = AuthPrincipal & {
	readonly id: string;
	/** Only 'human' is produced for now. 'service' is the socket for service accounts. */
	readonly type: PrincipalType;
	/** Optional: `user.email` is nullable, and a service account has none. */
	readonly email?: string;
	readonly firstName?: string;
	readonly lastName?: string;
};

/** How the caller proved its identity. There is no 'none': an unauthenticated request has no SecurityContext. */
export type AuthMethod =
	/** Browser session, also the public-API cookie path. */
	| 'session-cookie'
	/** The same as the session-cookie, minted by the embed flow. */
	| 'embed-cookie'
	| 'api-key'
	/** JWT issued by token exchange. It can carry an `act` claim. */
	| 'scoped-jwt'
	/** Any OAuth2 trusted source, internal or external. */
	| 'oauth-access-token';

/** What a trust source asserted. (sourceId, subject) is the identity-binding key. */
export type ClaimRef = {
	/** `trusted_source.id` */
	readonly sourceId: string;
	readonly issuer: string;
	/** The mapped subject claim. Never use it alone. */
	readonly subject: string;
};

export type ProtectedResourceRef = {
	readonly url: string;
	readonly acceptedAudiences: string[];
};

/**
 * What a protected resource hands out. Structural copy of `OAuthResourceGrant` in
 * `n8n-workflow`: this package is a leaf and cannot import it. A type test in `@n8n/db`
 * keeps the two assignable.
 */
export type ResourceGrant = {
	/** `aud` values a token issued for this resource may carry. */
	readonly audiences: string[];
	/** Workflow the holder must keep `workflow:execute` on. Absent if none is required. */
	readonly executeAccessWorkflowId?: string;
};

/** Who is calling, on whose authority, and how they proved it. No field holds a bearer token. */
export type SecurityContext = {
	/** Whose authority is used. */
	readonly subject: Principal;
	/** Who is calling, when delegated. Absent on direct calls. */
	readonly actor?: Principal;
	readonly authMethod: AuthMethod;
	/** Absent for session and API-key callers. */
	readonly subjectClaim?: ClaimRef;
	readonly actorClaim?: ClaimRef;
	/** Login record of a service account. Humans have none. */
	readonly subIdentityId?: string;
	/** OAuth client the token was issued to. */
	readonly clientId?: string;
	/** Scopes the token carries. A restriction, never a grant. */
	readonly tokenScopes?: string[];
	readonly apiKeyScopes?: string[];
	/** The protected resource the caller entered. */
	readonly resource?: ProtectedResourceRef;
	/** What that resource hands out. */
	readonly grant?: ResourceGrant;
	/** How the subject authenticated at the issuer. Carried, not evaluated. */
	readonly assurance?: {
		readonly acr?: string;
		readonly amr?: string[];
		readonly authTime?: Date;
	};
};
