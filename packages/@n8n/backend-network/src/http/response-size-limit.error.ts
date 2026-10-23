import { OperationalError } from 'n8n-workflow';

import { markNonRetryable } from './retryability';

export class HttpResponseSizeLimitError extends OperationalError {
	readonly code = 'ERR_RESPONSE_TOO_LARGE';

	constructor(maxBytes: number) {
		super(`Response body exceeded the maximum allowed size of ${maxBytes} bytes`);
		markNonRetryable(this);
	}
}
