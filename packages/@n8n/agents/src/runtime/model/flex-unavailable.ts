import { hasErrorCode } from './error-code';

/** How often a turn is re-issued while OpenAI has no Flex capacity, unless `flexUnavailableRetries` says otherwise. */
export const DEFAULT_FLEX_UNAVAILABLE_RETRIES = 10;

const FLEX_RETRY_BASE_DELAY_MS = 1000;
const FLEX_RETRY_MAX_DELAY_MS = 30_000;

/**
 * OpenAI rejects a Flex request that finds no free capacity with the code
 * `flex_unavailable` ("Resource Unavailable"). The rejection is not billed. On a
 * streaming request it arrives as an error event inside a 200 response, so the
 * AI SDK retry does not see it.
 */
export function isFlexUnavailable(error: unknown): boolean {
	return hasErrorCode(error, 'flex_unavailable');
}

/** Exponential backoff from 1 second, capped at 30 seconds. */
export function flexRetryDelayMs(attempt: number): number {
	return Math.min(FLEX_RETRY_MAX_DELAY_MS, FLEX_RETRY_BASE_DELAY_MS * 2 ** attempt);
}
