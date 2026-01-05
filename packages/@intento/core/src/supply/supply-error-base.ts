import type { IDataObject, INode, LogMetadata, NodeOperationError } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { ITraceable, IDataProvider } from 'types/*';

/**
 * Base class for supply errors with automatic latency tracking and retry logic.
 *
 * Correlates errors to originating requests via requestId and determines retryability
 * based on HTTP status codes (429, 5xx). Calculates end-to-end latency for failed attempts.
 *
 * @example
 * ```typescript
 * class TranslationError extends SupplyErrorBase {
 *   constructor(request: SupplyRequestBase, code: number, reason: string, private details?: string) {
 *     super(request, code, reason);
 *   }
 *
 *   asLogMetadata(): LogMetadata {
 *     return { requestId: this.requestId, latencyMs: this.latencyMs, code: this.code, reason: this.reason };
 *   }
 *
 *   asDataObject(): IDataObject {
 *     return { requestId: this.requestId, code: this.code, reason: this.reason, details: this.details };
 *   }
 *
 *   asError(node: INode): NodeOperationError {
 *     return new NodeOperationError(node, this.reason, { description: this.details });
 *   }
 * }
 * ```
 */
export abstract class SupplyErrorBase implements ITraceable, IDataProvider {
	readonly requestId: string;
	readonly latencyMs: number;
	readonly code: number;
	readonly reason: string;

	constructor(request: SupplyRequestBase, code: number, reason: string) {
		this.requestId = request.requestId;
		// NOTE: Latency measured from request creation to error construction for failed attempt timing
		this.latencyMs = Date.now() - request.requestedAt;
		this.code = code;
		this.reason = reason;
	}

	abstract asLogMetadata(): LogMetadata;
	abstract asDataObject(): IDataObject;

	/**
	 * Converts error to n8n NodeOperationError for workflow error handling.
	 *
	 * @param node - The n8n node where the error occurred, used for error context
	 */
	abstract asError(node: INode): NodeOperationError;

	/**
	 * Determines if error is retryable based on HTTP status code.
	 *
	 * @returns true for rate limiting (429) and server errors (5xx), false otherwise
	 */
	isRetryable(): boolean {
		// NOTE: 429 = rate limit, 5xx = server errors are typically transient and retryable
		return this.code === 429 || (this.code >= 500 && this.code < 600);
	}
}
