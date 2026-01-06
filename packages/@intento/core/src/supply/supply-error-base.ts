import type { IDataObject, INode, LogMetadata, NodeOperationError } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { ITraceable, IDataProvider } from 'types/*';

/**
 * Base class for external API error responses with automatic latency tracking.
 *
 * Captures error metadata from failed API requests including error codes, retry
 * eligibility, and request correlation. Subclasses implement provider-specific
 * error formatting for logging, n8n workflow data, and error propagation.
 *
 * **Latency calculation:** Automatically computed from request timestamp to
 * error instantiation, includes network round-trip and provider processing time.
 *
 * @example
 * ```typescript
 * class OpenAIError extends SupplyErrorBase {
 *   asLogMetadata() { return { ...super fields, providerCode: this.code }; }
 *   asDataObject() { return { error: this.reason, retriable: this.isRetriable }; }
 *   asError(node) { return new NodeOperationError(node, this.reason); }
 * }
 * ```
 */
export abstract class SupplyErrorBase implements ITraceable, IDataProvider {
	/** Request correlation ID from originating supply request. */
	readonly requestId: string;

	/** Milliseconds from request initiation to error capture (includes network + processing). */
	readonly latencyMs: number;

	/** Provider-specific error code (HTTP status, API error code, or internal code). */
	readonly code: number;

	/** Human-readable error description from provider or error classifier. */
	readonly reason: string;

	/** Whether this error qualifies for automatic retry (rate limits, transient failures). */
	readonly isRetriable: boolean;

	/**
	 * Creates error instance with automatic latency calculation from request timestamp.
	 *
	 * Extracts requestId and timestamp from originating request, computes elapsed time
	 * to capture full request-response cycle including network latency and provider
	 * processing time.
	 *
	 * @param request - Originating supply request with requestId and timestamp
	 * @param code - Provider error code (HTTP status, API code, or classifier code)
	 * @param reason - Human-readable error message for logging and user display
	 * @param isRetriable - True if error is transient and qualifies for retry
	 */
	constructor(request: SupplyRequestBase, code: number, reason: string, isRetriable: boolean) {
		this.requestId = request.requestId;
		// NOTE: Latency measured from request.requestedAt (Date.now() at request creation)
		// to current time, includes network round-trip + provider processing + error handling
		this.latencyMs = Date.now() - request.requestedAt;
		this.code = code;
		this.reason = reason;
		this.isRetriable = isRetriable;
	}

	/**
	 * Converts error to structured log metadata for distributed tracing.
	 *
	 * Must include at minimum: requestId, code, reason, isRetriable, latencyMs.
	 * Subclasses should add provider-specific fields (API version, rate limit info, etc.).
	 *
	 * @returns Structured metadata for correlation across log aggregation systems
	 */
	abstract asLogMetadata(): LogMetadata;

	/**
	 * Converts error to n8n workflow data format for downstream nodes.
	 *
	 * Returned object appears in workflow execution data and can be accessed by
	 * subsequent nodes. Should include user-facing error details, exclude internal
	 * debugging information.
	 *
	 * @returns Plain object suitable for JSON serialization in workflow data
	 */
	abstract asDataObject(): IDataObject;

	/**
	 * Converts error to NodeOperationError for workflow execution failure.
	 *
	 * Thrown error halts workflow execution and displays in n8n UI. Should provide
	 * actionable guidance for workflow authors (check API key, adjust rate limits, etc.).
	 *
	 * @param node - n8n node where error occurred (for error context and UI display)
	 * @returns NodeOperationError with user-facing message and error details
	 */
	abstract asError(node: INode): NodeOperationError;
}
