import type { IDataObject, INode, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { ITraceable, IDataProvider, IValidatable } from 'types/*';

/**
 * Supply operation error with HTTP-style status codes, retry logic, and latency tracking.
 *
 * Created by SupplierBase.onError() for timeout (408), abort (499), and unexpected (500) errors.
 * Tracks both agentRequestId (for correlation) and supplyRequestId (for operation tracking).
 * isRetriable flag determines whether operation should be retried on failure.
 */
export class SupplyError implements IValidatable, ITraceable, IDataProvider {
	readonly agentRequestId: string;
	readonly supplyRequestId: string;
	readonly latencyMs: number;
	readonly code: number;
	readonly reason: string;
	readonly isRetriable: boolean;

	/**
	 * Creates supply error with HTTP status code, retry flag, and descriptive reason.
	 *
	 * Calculates latencyMs immediately - must be created when error occurs, not later.
	 * Status codes: 408 (timeout), 499 (abort), 500 (unexpected error).
	 *
	 * @param request - Originating supply request for IDs and timestamp
	 * @param code - HTTP status code (100-599) indicating error category
	 * @param reason - Human-readable error description for n8n display
	 * @param isRetriable - Whether operation can be retried (false for permanent failures)
	 */
	constructor(request: SupplyRequestBase, code: number, reason: string, isRetriable: boolean) {
		this.agentRequestId = request.agentRequestId;
		this.supplyRequestId = request.supplyRequestId;
		// NOTE: Latency calculated immediately - ensures accurate measurement at error time
		this.latencyMs = Date.now() - request.requestedAt;
		this.code = code;
		this.reason = reason;
		this.isRetriable = isRetriable;
	}

	/**
	 * Validates error instance state and throws if invalid.
	 *
	 * Checks required fields (agentRequestId, supplyRequestId, reason) and HTTP status code range.
	 * Note: latencyMs and isRetriable not validated - assumed valid from constructor.
	 *
	 * @throws Error if agentRequestId, supplyRequestId, or reason empty
	 * @throws RangeError if code outside 100-599 range
	 */
	throwIfInvalid(): void {
		if (!this.agentRequestId || this.agentRequestId.trim() === '') throw new Error('"agentRequestId" is required');
		if (!this.supplyRequestId || this.supplyRequestId.trim() === '') throw new Error('"supplyRequestId" is required');
		if (!this.reason || this.reason.trim() === '') throw new Error('"reason" is required');
		if (this.code < 100 || this.code > 599) throw new RangeError('"code" must be a valid HTTP status code (100-599)');
	}

	/**
	 * Returns metadata for structured logging and distributed tracing.
	 *
	 * Includes both agentRequestId and supplyRequestId for full request/operation correlation.
	 * isRetriable flag helps logging systems categorize and alert on permanent vs transient failures.
	 *
	 * @returns Log metadata with request IDs, error details, and retry status
	 */
	asLogMetadata(): LogMetadata {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
			code: this.code,
			reason: this.reason,
			isRetriable: this.isRetriable,
			latencyMs: this.latencyMs,
		};
	}

	/**
	 * Converts error to n8n data object for workflow output.
	 *
	 * Returns minimal error info (code, reason, latencyMs) without internal IDs.
	 * Used when error is propagated as workflow data rather than thrown exception.
	 *
	 * @returns Data object with error code, message, and execution latency
	 */
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
	 * Note: Only preserves reason message - loses code, isRetriable, supplyRequestId, latencyMs.
	 * This is n8n's standard error format for node execution failures.
	 *
	 * @param node - The n8n node where error occurred (for error context)
	 * @returns NodeOperationError with reason message
	 */
	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, this.reason);
	}
}
