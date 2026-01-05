import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { IDataProvider, ITraceable } from 'types/*';

/**
 * Base class for supply requests with automatic ID generation and timestamp tracking.
 *
 * Generates unique requestId for correlation across retries/responses and captures
 * timestamp for latency measurement. SupplierBase clones requests for each retry attempt.
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
 *     return { requestId: this.requestId, from: this.from, to: this.to, textLength: this.text.length };
 *   }
 *
 *   asDataObject(): IDataObject {
 *     return { requestId: this.requestId, text: this.text, from: this.from, to: this.to };
 *   }
 *
 *   clone(): this {
 *     return new TranslationRequest(this.text, this.from, this.to) as this;
 *   }
 * }
 * ```
 */
export abstract class SupplyRequestBase implements ITraceable, IDataProvider {
	readonly requestId: string;
	readonly requestedAt: number;

	constructor() {
		// NOTE: crypto.randomUUID() provides RFC 4122 v4 UUIDs for global uniqueness across distributed systems
		this.requestId = crypto.randomUUID();
		// NOTE: Timestamp captured at construction, used by SupplyResponseBase to calculate end-to-end latencyMs
		this.requestedAt = Date.now();
	}

	abstract asLogMetadata(): LogMetadata;
	abstract asDataObject(): IDataObject;

	/**
	 * Creates a deep copy of the request for retry attempts.
	 *
	 * NOTE: SupplierBase calls this before each retry to ensure request immutability.
	 */
	abstract clone(): this;
}
