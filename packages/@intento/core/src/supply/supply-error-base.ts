import type { INode, INodeExecutionData, LogMetadata, NodeOperationError } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { ITraceable, IDataProvider } from 'types/*';

/**
 * Base class for supply operation errors with request correlation and latency tracking.
 *
 * Provides standardized error representation across supply chain operations with automatic
 * performance metrics. Subclasses must implement serialization for logging, execution data,
 * and n8n error handling.
 *
 * Latency calculation: Uses request timestamp to measure operation duration at error time.
 * Request correlation: Preserves requestId for tracing failed operations.
 */
export abstract class SupplyErrorBase implements ITraceable, IDataProvider {
	/**
	 * Correlation ID copied from the originating request.
	 *
	 * Used to trace errors back to their source request for debugging and monitoring.
	 */
	readonly requestId: string;

	/**
	 * Operation duration in milliseconds from request timestamp to error.
	 *
	 * Calculated as: Date.now() - request.requestedAt
	 * Useful for identifying slow-failing operations and timeout analysis.
	 */
	readonly latencyMs: number;

	/**
	 * Error code representing the specific failure type.
	 *
	 * Numeric code allows programmatic error handling and classification.
	 */
	readonly code: number;

	/**
	 * Human-readable error message describing the failure.
	 *
	 * Should provide actionable information for debugging and user feedback.
	 */
	readonly reason: string;

	/**
	 * Creates supply error with automatic latency calculation from request timestamp.
	 *
	 * Latency measurement captures operation duration up to error occurrence, helping
	 * identify slow failures, timeout issues, and performance bottlenecks.
	 *
	 * @param request - Originating request providing requestId and timestamp for correlation
	 * @param code - Numeric error code for programmatic error classification
	 * @param reason - Human-readable error message for logging and user feedback
	 */
	constructor(request: SupplyRequestBase, code: number, reason: string) {
		this.requestId = request.requestId;
		// Measure operation duration from request start to error occurrence
		this.latencyMs = Date.now() - request.requestedAt;
		this.code = code;
		this.reason = reason;
	}

	/**
	 * Serializes error for structured logging with correlation metadata.
	 *
	 * Subclasses must implement to provide error-specific log fields while preserving
	 * requestId and latencyMs for tracing and performance analysis.
	 *
	 * @returns Structured log metadata including error details and correlation data
	 */
	abstract asLogMetadata(): LogMetadata;

	/**
	 * Serializes error as n8n execution data for workflow error handling.
	 *
	 * Subclasses must implement to format error for n8n's execution data model,
	 * allowing workflow error handlers to process failure information.
	 *
	 * @returns Array of execution data items representing the error state
	 */
	abstract asExecutionData(): INodeExecutionData[][];

	/**
	 * Converts error to n8n NodeOperationError for workflow exception handling.
	 *
	 * Subclasses must implement to create properly contextualized errors with node
	 * information, enabling n8n's error reporting and workflow interruption.
	 *
	 * @param node - n8n node where error occurred, used for error context and reporting
	 * @returns NodeOperationError instance for n8n error handling system
	 */
	abstract asError(node: INode): NodeOperationError;
}
