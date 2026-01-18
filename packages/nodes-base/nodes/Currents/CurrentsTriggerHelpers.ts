import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * Maximum allowed age for a webhook request timestamp (5 minutes).
 * Requests older than this are considered potential replay attacks.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * Verifies the webhook request is recent and optionally validates a secret header.
 *
 * Currents.dev includes an `x-timestamp` header with the epoch timestamp of the request.
 * This function validates that the timestamp is within an acceptable window to prevent
 * replay attacks. Additionally, if a secret header is configured, it validates that.
 *
 * @returns true if the request is valid, false otherwise
 */
export function verifyWebhook(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const headerData = this.getHeaderData();

	// Check timestamp to prevent replay attacks
	const timestamp = req.headers['x-timestamp'] as string | undefined;
	if (timestamp) {
		const requestTime = parseInt(timestamp, 10);
		const currentTime = Math.floor(Date.now() / 1000);
		const age = Math.abs(currentTime - requestTime);

		if (age > MAX_TIMESTAMP_AGE_SECONDS) {
			return false;
		}
	}

	// Check optional secret header if configured
	const expectedSecret = this.getNodeParameter('webhookSecret', '') as string;
	if (expectedSecret) {
		const secretHeaderName = this.getNodeParameter(
			'secretHeaderName',
			'x-webhook-secret',
		) as string;
		const actualSecret = headerData[secretHeaderName.toLowerCase()] as string | undefined;

		if (actualSecret !== expectedSecret) {
			return false;
		}
	}

	return true;
}

/**
 * Validates that a timestamp is within the acceptable window.
 * Exported separately for unit testing.
 */
export function isTimestampValid(timestamp: number, currentTime?: number): boolean {
	const now = currentTime ?? Math.floor(Date.now() / 1000);
	const age = Math.abs(now - timestamp);
	return age <= MAX_TIMESTAMP_AGE_SECONDS;
}
