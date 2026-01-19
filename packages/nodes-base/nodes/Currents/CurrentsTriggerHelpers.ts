import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

/**
 * Maximum allowed age for a webhook request timestamp (5 minutes).
 * Requests older than this are considered potential replay attacks.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * Verifies the webhook request is recent and optionally validates a secret header.
 *
 * Currents.dev includes an `x-timestamp` header with the epoch timestamp in milliseconds.
 * This function validates that the timestamp is within an acceptable window to prevent
 * replay attacks. Additionally, if a secret header is configured, it validates that.
 *
 * @returns true if the request is valid, false otherwise
 */
export function verifyWebhook(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const headerData = this.getHeaderData();

	// Check timestamp to prevent replay attacks (Currents sends milliseconds)
	const timestampHeader = req.headers['x-timestamp'] as string | undefined;
	if (timestampHeader) {
		const requestTimeMs = parseInt(timestampHeader, 10);
		const requestTimeSec = Math.floor(requestTimeMs / 1000);
		const currentTimeSec = Math.floor(Date.now() / 1000);
		const age = Math.abs(currentTimeSec - requestTimeSec);

		if (age > MAX_TIMESTAMP_AGE_SECONDS) {
			return false;
		}
	}

	// Check optional secret header if configured (nested under 'options' collection)
	const options = this.getNodeParameter('options', {}) as IDataObject;
	const expectedSecret = (options.webhookSecret as string) || '';

	if (expectedSecret) {
		const validationHeaderName = (options.validationHeaderName as string) || 'x-webhook-secret';
		const actualSecret = headerData[validationHeaderName.toLowerCase()] as string | undefined;

		if (actualSecret !== expectedSecret) {
			return false;
		}
	}

	return true;
}

/**
 * Validates that a millisecond timestamp is within the acceptable window.
 * Exported separately for unit testing.
 */
export function isTimestampValid(timestampMs: number, currentTimeSec?: number): boolean {
	const requestTimeSec = Math.floor(timestampMs / 1000);
	const now = currentTimeSec ?? Math.floor(Date.now() / 1000);
	const age = Math.abs(now - requestTimeSec);
	return age <= MAX_TIMESTAMP_AGE_SECONDS;
}
