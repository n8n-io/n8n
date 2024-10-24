import { RESPONSE_ERROR_MESSAGES } from '@/constants';

import { ResponseError } from './abstract/response.error';

export class MissingScopeError extends ResponseError {
	constructor(message = RESPONSE_ERROR_MESSAGES.MISSING_SCOPE, hint?: string) {
		super(message, 403, 403, hint);
	}
}
