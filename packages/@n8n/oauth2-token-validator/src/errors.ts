/**
 * Thrown when a token cannot be validated: bad signature, expired, wrong
 * issuer/audience, unreachable JWKS, or a malformed token. Callers map this to
 * an authentication failure (HTTP 401) at the trigger boundary.
 */
export class TokenValidationError extends Error {
	constructor(
		message: string,
		readonly options: { cause?: unknown } = {},
	) {
		super(message, options.cause ? { cause: options.cause } : undefined);
		this.name = 'TokenValidationError';
	}
}
