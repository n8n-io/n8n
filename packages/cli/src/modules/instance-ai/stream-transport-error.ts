import { isDnsFailure, isTransportFailure } from '@n8n/backend-network';
import { isQuotaExhaustedError } from '@n8n/instance-ai';

/**
 * True when a run died because the connection to the model provider broke.
 *
 * Quota is checked first: hitting the credit wall at the model call also dies
 * as a transport failure, which `QuotaExhaustedStreamError` keeps as its
 * `cause`. DNS is excluded so a misconfigured `baseURL` stays visible.
 */
export function isStreamTransportError(error: unknown): boolean {
	return !isQuotaExhaustedError(error) && !isDnsFailure(error) && isTransportFailure(error);
}
