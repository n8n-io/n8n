import { AuthError } from '@/errors/response-errors/auth.error.js';
import { BadRequestError } from '@/errors/response-errors/bad-request.error.js';

import type { TokenExchangeFailureReason } from './token-exchange.types.js';

/**
 * AuthError subclass that carries a typed failure reason for Prometheus metrics.
 * Extends AuthError so existing `instanceof AuthError` checks in controllers continue to work.
 */
export class TokenExchangeAuthError extends AuthError {
	constructor(
		readonly reason: TokenExchangeFailureReason,
		message: string,
	) {
		super(message);
	}
}

/**
 * BadRequestError subclass that carries a typed failure reason for Prometheus metrics.
 * Extends BadRequestError so existing `instanceof BadRequestError` checks in controllers continue to work.
 */
export class TokenExchangeRequestError extends BadRequestError {
	constructor(
		readonly reason: TokenExchangeFailureReason,
		message: string,
	) {
		super(message);
	}
}
