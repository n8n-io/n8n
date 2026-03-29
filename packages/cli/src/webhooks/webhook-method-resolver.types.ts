import type { IHttpRequestMethods } from 'n8n-workflow';

/**
 * Interface for resolving HTTP methods supported by a webhook at a given path.
 *
 * This interface separates the concern of method resolution from webhook execution,
 * making it:
 * - Testable in isolation
 * - Reusable across different webhook types
 * - Explicit about security properties (empty arrays for invalid states)
 *
 * **Security Contract:**
 * - Returns empty array for invalid/missing webhooks (prevents information disclosure)
 * - Returns empty array for finished/cancelled executions (no webhook can resume them)
 * - Only returns methods for webhooks that can actually handle requests
 *
 * **Implementation Notes:**
 * - Implementations should handle errors gracefully and return empty arrays
 * - Implementations should not throw errors that could leak information about execution state
 * - Path format is implementation-specific (e.g., executionId for waiting webhooks)
 */
export interface IWebhookMethodResolver {
	/**
	 * Resolves all HTTP methods supported by a webhook at the given path.
	 *
	 * @param path - Webhook path (format is implementation-specific)
	 * @returns Promise resolving to array of supported HTTP methods, or empty array if none
	 */
	resolveMethods(path: string): Promise<IHttpRequestMethods[]>;
}
