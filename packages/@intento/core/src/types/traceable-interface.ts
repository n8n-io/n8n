import type { LogMetadata } from 'n8n-workflow';

/**
 * Interface for objects that can provide structured logging metadata.
 *
 * Enables consistent, structured logging across all intento-core components
 * by standardizing how objects expose their data for logging purposes.
 *
 * **Primary Use Cases:**
 * - Supply chain logging: Requests, responses, and errors in supplier retry flows
 * - Context serialization: Configuration values for debug/error enrichment
 * - Tracer integration: Automatic metadata extraction for structured logs
 *
 * **Implementation Requirements:**
 * - Return flat key-value pairs (no nested objects unless semantically meaningful)
 * - Include only actionable data (IDs, counts, statuses, timestamps)
 * - Omit sensitive data (credentials, PII, tokens)
 * - Use consistent key naming across implementations
 *
 * @example
 * ```typescript
 * class TranslationRequest implements ITraceable {
 *   asLogMetadata(): LogMetadata {
 *     return {
 *       requestId: this.requestId,
 *       sourceLanguage: this.source,
 *       targetLanguage: this.target,
 *       textLength: this.text.length
 *     };
 *   }
 * }
 * ```
 *
 * @see {@link SupplyRequestBase} for request implementation pattern
 * @see {@link ExecutionContext.asLogMetadata} for context implementation pattern
 */
export interface ITraceable {
	/**
	 * Converts object state into structured logging metadata.
	 *
	 * **Used by Tracer** to automatically enrich log entries with context from
	 * traceable objects passed to debug/info/warn/error methods.
	 *
	 * @returns Flat object with primitive values suitable for logging systems
	 *
	 * @example
	 * ```typescript
	 * // Tracer automatically extracts metadata
	 * tracer.debug('Supply attempt starting', request.asLogMetadata());
	 * // Logs: { requestId: 'abc-123', sourceLanguage: 'en', targetLanguage: 'fr', textLength: 42 }
	 * ```
	 */
	asLogMetadata(): LogMetadata;
}
