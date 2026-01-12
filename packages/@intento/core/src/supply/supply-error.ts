import type { IDataObject, INode, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { ITraceable, IDataProvider } from 'types/*';

/**
 * Structured error for supply operations with tracing and retry capability.
 *
 * Captures error details with request context for debugging and retry logic.
 * Use isRetriable flag to indicate whether operation should be retried.
 */
export class SupplyError implements ITraceable, IDataProvider {
	readonly requestId: string;
	readonly latencyMs: number;
	readonly code: number;
	readonly reason: string;
	readonly isRetriable: boolean;

	/**
	 * Creates supply error with request context and error details.
	 *
	 * @param request - Original request for tracing and latency calculation
	 * @param code - Error code for categorization (e.g., HTTP status, custom error codes)
	 * @param reason - Human-readable error description
	 * @param isRetriable - Whether operation can be retried (true for transient failures)
	 */
	constructor(request: SupplyRequestBase, code: number, reason: string, isRetriable: boolean) {
		this.requestId = request.requestId;
		// NOTE: Latency captured immediately to measure time to failure
		this.latencyMs = Date.now() - request.requestedAt;
		this.code = code;
		this.reason = reason;
		this.isRetriable = isRetriable;
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			code: this.code,
			reason: this.reason,
			isRetriable: this.isRetriable,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			code: this.code,
			reason: this.reason,
			latencyMs: this.latencyMs,
		};
	}

	/**
	 * Converts to n8n NodeOperationError for workflow error handling.
	 *
	 * @param node - Node where error occurred for error context
	 * @returns NodeOperationError with reason message for n8n error display
	 */
	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, this.reason);
	}
}
