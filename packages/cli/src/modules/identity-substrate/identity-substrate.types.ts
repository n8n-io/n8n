/**
 * `TokenNearExpiry` is consumer-exclusive (only thrown by the token-exchange
 * consumer's `exchange()` flow), but lives here rather than in the consumer's
 * own types because `TokenExchangeAuthError`/`TokenExchangeRequestError` -
 * both substrate-owned - parametrize on this enum, and consumer code throws
 * it through those same error classes.
 */
export const TokenExchangeFailureReason = {
	InvalidSignature: 'invalid_signature',
	UnknownKey: 'unknown_key',
	TokenReplay: 'token_replay',
	TokenTooLong: 'token_too_long',
	TokenNearExpiry: 'token_near_expiry',
	InvalidFormat: 'invalid_format',
	MissingKid: 'missing_kid',
	MissingIss: 'missing_iss',
	AudienceRequired: 'audience_required',
	InvalidClaims: 'invalid_claims',
	InternalError: 'internal_error',
	RoleNotAllowed: 'role_not_allowed',
	EmailNotVerified: 'email_not_verified',
	Other: 'other',
} as const;

export type TokenExchangeFailureReason =
	(typeof TokenExchangeFailureReason)[keyof typeof TokenExchangeFailureReason];
