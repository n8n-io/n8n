import type { INodeExecutionData, LogMetadata } from 'n8n-workflow';

import type { IDataProvider, ITraceable } from 'types/*';

/**
 * Base class for supply requests with automatic ID generation and timestamp tracking.
 *
 * Each request gets a unique ID for correlation across retries and responses, and a
 * timestamp that enables latency measurement when the response is created. Extend this
 * class to implement specific supply request types with request-specific data.
 *
 * **Used by SupplierBase** to track retry attempts in n8n's execution UI. Each retry
 * creates a cloned request with the same requestId but potentially modified data.
 *
 * @example
 * ```typescript
 * class TranslationRequest extends SupplyRequestBase {
 *   constructor(
 *     private readonly text: string,
 *     private readonly from: string,
 *     private readonly to: string
 *   ) {
 *     super();
 *   }
 *
 *   asLogMetadata(): LogMetadata {
 *     return {
 *       requestId: this.requestId,
 *       from: this.from,
 *       to: this.to,
 *       textLength: this.text.length
 *     };
 *   }
 *
 *   asExecutionData(): INodeExecutionData[][] {
 *     return [[{ json: { requestId: this.requestId, text: this.text, from: this.from, to: this.to } }]];
 *   }
 *
 *   clone(): this {
 *     return new TranslationRequest(this.text, this.from, this.to) as this;
 *   }
 * }
 * ```
 *
 * @see {@link SupplyResponseBase} for response correlation pattern
 * @see {@link SupplierBase.supplyWithRetries} where requests are cloned for each retry
 */
export abstract class SupplyRequestBase implements ITraceable, IDataProvider {
	/** Unique identifier for correlating requests with responses across retry attempts. */
	readonly requestId: string;

	/** Unix timestamp in milliseconds when request was created, used for latency calculation. */
	readonly requestedAt: number;

	/**
	 * Creates a new supply request with automatic ID and timestamp.
	 *
	 * **ID Generation**: Uses crypto.randomUUID() for globally unique identifiers
	 * **Timestamp**: Captures Date.now() at construction time for latency tracking
	 */
	constructor() {
		// NOTE: crypto.randomUUID() provides RFC 4122 v4 UUIDs for global uniqueness
		this.requestId = crypto.randomUUID();
		// NOTE: Timestamp captured at construction, used by response to calculate latencyMs
		this.requestedAt = Date.now();
	}

	/**
	 * Converts request to structured log metadata for observability.
	 *
	 * @returns Log metadata object including at minimum requestId and request-specific fields
	 *
	 * @example
	 * ```typescript
	 * asLogMetadata(): LogMetadata {
	 *   return { requestId: this.requestId, operation: 'translate', textLength: this.text.length };
	 * }
	 * ```
	 */
	abstract asLogMetadata(): LogMetadata;

	/**
	 * Converts request to n8n execution data format for workflow tracking.
	 *
	 * @returns Nested array of execution data items (outer array = output branches, inner array = items per branch)
	 *
	 * @example
	 * ```typescript
	 * asExecutionData(): INodeExecutionData[][] {
	 *   return [[{ json: { requestId: this.requestId, text: this.text, from: this.from, to: this.to } }]];
	 * }
	 * ```
	 */
	abstract asExecutionData(): INodeExecutionData[][];

	/**
	 * Creates a deep copy of the request for retry attempts.
	 *
	 * **Required for retries**: SupplierBase clones requests before each retry attempt to
	 * ensure request immutability and proper tracking in n8n's execution UI.
	 *
	 * @returns New instance with same data but potentially fresh timestamp if needed
	 *
	 * @example
	 * ```typescript
	 * clone(): this {
	 *   return new TranslationRequest(this.text, this.from, this.to) as this;
	 * }
	 * ```
	 */
	abstract clone(): this;
}
