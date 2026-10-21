import { z } from 'zod';

/**
 * Why the SCIM bearer check rejected a request from the identity provider.
 * - `missing_header`: the request has no `Authorization: Bearer` header.
 * - `invalid_token`: the token is not a SCIM token of this instance.
 * - `superseded_token`: this instance issued the token, but an admin rotated
 *   or revoked it. The instance knows the last 10 such tokens.
 */
export const scimAuthFailureReasonSchema = z.enum([
	'missing_header',
	'invalid_token',
	'superseded_token',
]);

/** The last SCIM request that the bearer check rejected. */
export const scimAuthFailureSchema = z.object({
	/** ISO timestamp of the request. */
	at: z.string().datetime(),
	reason: scimAuthFailureReasonSchema,
});

export type ScimAuthFailureReason = z.infer<typeof scimAuthFailureReasonSchema>;
export type ScimAuthFailure = z.infer<typeof scimAuthFailureSchema>;

/**
 * Connection state of the identity provider, from the requests that arrive.
 * - `waiting`: no request used the current token yet.
 * - `connected`: a request used the current token, and no `error` case
 *   came after the last use.
 * - `error`: a request failed the bearer check after the token was created
 *   and before its first use. After the first use, only a request with an
 *   old token of this instance (`superseded_token`) after the last use
 *   causes `error`. Any client can cause the other failures.
 */
export type ScimConnectionStatus = 'waiting' | 'connected' | 'error';

export type ScimTokenCreator = {
	id: string;
	firstName: string | null;
	lastName: string | null;
};

export type ScimTokenDetails = {
	/** ISO timestamp. A rotation sets a new value. */
	createdAt: string;
	/** Null after the creator was deleted. */
	createdBy: ScimTokenCreator | null;
	/** ISO timestamp of the last recorded request with this token, or null. */
	lastUsedAt: string | null;
};

/** Response of `GET /rest/scim/config`. */
export type ScimConfigResponse = {
	enabled: boolean;
	hasToken: boolean;
	/** Last four characters of the token, or null without a token. */
	tokenHint: string | null;
	baseUrl: string;
	/** Null when the instance has no SCIM token. */
	token: ScimTokenDetails | null;
	/**
	 * Null when no request failed the bearer check since the last reset. A
	 * failure without a token of this instance does not replace a stored
	 * `superseded_token` failure. The value is a diagnostic and can come with
	 * any status.
	 */
	lastAuthFailure: ScimAuthFailure | null;
	status: ScimConnectionStatus;
	/**
	 * Number of SCIM-managed users, deactivated users included. A user is
	 * SCIM-managed after SCIM created, updated or deactivated them.
	 */
	provisionedCount: number;
	/** Number of SCIM-managed users that are deactivated. */
	deactivatedCount: number;
};
