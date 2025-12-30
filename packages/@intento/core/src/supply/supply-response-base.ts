import type { INodeExecutionData, LogMetadata } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { IDataProvider, ITraceable } from 'types/*';

/**
 * Base class for successful supply responses with request correlation.
 *
 * Automatically calculates latency from request timestamp for performance tracking.
 * Extends this class to implement specific supply response types with tracing and data conversion.
 *
 * @example
 * ```typescript
 * class MySupplyResponse extends SupplyResponseBase {
 *   constructor(request: SupplyRequestBase, private data: MyData) {
 *     super(request);
 *   }
 *
 *   asLogMetadata(): LogMetadata {
 *     return { requestId: this.requestId, latencyMs: this.latencyMs, data: this.data };
 *   }
 *
 *   asExecutionData(): INodeExecutionData[][] {
 *     return [[{ json: this.data }]];
 *   }
 * }
 * ```
 */
export abstract class SupplyResponseBase implements ITraceable, IDataProvider {
	/** Unique identifier copied from the originating request for correlation. */
	readonly requestId: string;

	/** Time elapsed in milliseconds between request creation and response construction. */
	readonly latencyMs: number;

	/**
	 * Creates a supply response correlated to the given request.
	 *
	 * @param request - The originating supply request, used for correlation and latency calculation
	 */
	constructor(request: SupplyRequestBase) {
		this.requestId = request.requestId;
		// NOTE: Latency calculated at construction time, measuring from request creation to response instantiation
		this.latencyMs = Date.now() - request.requestedAt;
	}

	/**
	 * Converts response to structured log metadata for observability.
	 *
	 * @returns Log metadata object including at minimum requestId, latencyMs, and response-specific fields
	 */
	abstract asLogMetadata(): LogMetadata;

	/**
	 * Converts response to n8n execution data format for workflow processing.
	 *
	 * @returns Nested array of execution data items (outer array = output branches, inner array = items per branch)
	 */
	abstract asExecutionData(): INodeExecutionData[][];
}
