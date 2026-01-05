import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { IDataProvider, ITraceable } from 'types/*';

/**
 * Base class for successful supply responses with automatic latency tracking.
 *
 * Correlates responses to originating requests via requestId and calculates end-to-end
 * latency for performance monitoring in logs and n8n execution UI.
 *
 * @example
 * ```typescript
 * class TranslationResponse extends SupplyResponseBase {
 *   constructor(request: SupplyRequestBase, private text: string) {
 *     super(request);
 *   }
 *
 *   asLogMetadata(): LogMetadata {
 *     return { requestId: this.requestId, latencyMs: this.latencyMs, text: this.text };
 *   }
 *
 *   asDataObject(): IDataObject {
 *     return { requestId: this.requestId, latencyMs: this.latencyMs, text: this.text };
 *   }
 * }
 * ```
 */
export abstract class SupplyResponseBase implements ITraceable, IDataProvider {
	readonly requestId: string;
	readonly latencyMs: number;

	constructor(request: SupplyRequestBase) {
		this.requestId = request.requestId;
		// NOTE: Latency measured from request creation to response construction for end-to-end timing
		this.latencyMs = Date.now() - request.requestedAt;
	}

	abstract asLogMetadata(): LogMetadata;
	abstract asDataObject(): IDataObject;
}
