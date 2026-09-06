import { ServerError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

import { AuthError } from '@/errors/response-errors/auth.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

// The wording references MCP because the instance MCP server is currently the
// only protected resource; clients registered via its DCR endpoint see this
// message. Revisit once the OAuth server serves non-MCP resources.
export const buildOAuthClientLimitReachedMessage = (limit: number): string =>
	`This n8n instance has reached its maximum of ${limit} registered MCP clients. Ask an administrator to revoke unused clients or raise N8N_MCP_MAX_REGISTERED_CLIENTS.`;

/**
 * Thrown from the DCR registration path when the instance-wide registered-client
 * cap is hit. Subclasses the MCP SDK's `ServerError` so that the SDK's register
 * handler surfaces our descriptive body instead of its generic
 * "Internal Server Error" fallback.
 */
export class OAuthClientLimitReachedError extends ServerError {
	readonly limit: number;

	constructor(limit: number) {
		super(buildOAuthClientLimitReachedMessage(limit));
		this.name = 'OAuthClientLimitReachedError';
		this.limit = limit;
	}
}

/**
 * Thrown from the consent flow when the target protected resource is switched
 * off on this instance (e.g. instance MCP access disabled). Distinct from a
 * plain `ForbiddenError` so the consent screen can tell the user which setting
 * to change instead of reporting a permission problem.
 */
export class ProtectedResourceDisabledError extends ForbiddenError {
	constructor() {
		super('The requested resource is not available for authorization');
		this.name = 'ProtectedResourceDisabledError';
	}
}

export class JWTVerificationError extends AuthError {
	constructor() {
		super('JWT Verification Failed');
		this.name = 'JWTVerificationError';
	}
}

export class AccessTokenNotFoundError extends AuthError {
	constructor() {
		super('Access Token Not Found in Database');
		this.name = 'AccessTokenNotFoundError';
	}
}
