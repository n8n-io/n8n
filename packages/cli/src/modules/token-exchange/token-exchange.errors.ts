import { AuthError, BadRequestError } from '@n8n/backend-services';

import type { TokenExchangeFailureReason } from './token-exchange.types';

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
