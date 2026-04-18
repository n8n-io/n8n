import type { TOKEN_EXCHANGE_GRANT_TYPE } from './token-exchange.schemas';

export const TokenExchangeFailureReason = {
	InvalidSignature: 'invalid_signature',
	UnknownKey: 'unknown_key',
	TokenReplay: 'token_replay',
	TokenTooLong: 'token_too_long',
	TokenNearExpiry: 'token_near_expiry',
	InvalidFormat: 'invalid_format',
	MissingKid: 'missing_kid',
	MissingIss: 'missing_iss',
	InvalidClaims: 'invalid_claims',
	InternalError: 'internal_error',
	RoleNotAllowed: 'role_not_allowed',
	Other: 'other',
} as const;

export type TokenExchangeFailureReason =
	(typeof TokenExchangeFailureReason)[keyof typeof TokenExchangeFailureReason];

export interface IssuedTokenResult {
	accessToken: string;
	expiresIn: number;
	subject: string;
	subjectUserId: string;
	issuer: string;
	actor?: string;
	actorUserId?: string;
}

export interface IssuedJwtPayload {
	iss: string;
	sub: string;
	act?: { sub: string };
	scope?: string;
	resource?: string[];
	iat: number;
	exp: number;
	jti: string;
}

export const TOKEN_EXCHANGE_ISSUER = 'n8n-token-exchange';

export type TokenExchangeAuditEvent =
	| {
			event: 'token_exchange_success';
			subject: string;
			actor?: string;
			scopes?: string;
			resource?: string;
			grantType: typeof TOKEN_EXCHANGE_GRANT_TYPE;
			kid?: string;
			issuer: string;
			tokenId?: string;
			clientIp: string;
	  }
	| {
			event: 'token_exchange_failure';
			subject?: string;
			failureReason: string;
			grantType: string;
			clientIp: string;
	  }
	| {
			event: 'embed_login';
			subject: string;
			issuer: string;
			clientIp: string;
	  };

export interface TokenExchangeSuccessResponse {
	access_token: string;
	token_type: 'Bearer';
	expires_in: number;
	scope?: string;
	issued_token_type: 'urn:ietf:params:oauth:token-type:access_token';
}
