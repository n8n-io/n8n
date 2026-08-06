import type { TOKEN_EXCHANGE_GRANT_TYPE } from './token-exchange.schemas';

// Re-exported so existing call sites (controllers, events, other modules)
// that import `TokenExchangeFailureReason` from here keep working unchanged
// - the enum itself is substrate-owned (see `identity-substrate.types.ts`)
// since `IdentityResolutionService` throws it too and can't depend on this
// (consumer) module.
export { TokenExchangeFailureReason } from '@/modules/identity-substrate/identity-substrate.types';

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
