import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { IDataProvider, ITraceable } from 'types/*';

/**
 * Base class for supply operation responses with timing and tracing.
 *
 * Provides request ID propagation and latency tracking. Subclasses should
 * call super() first to capture accurate latency, then add domain-specific data.
 */
export abstract class SupplyResponseBase implements ITraceable, IDataProvider {
	readonly requestId: string;
	readonly latencyMs: number;

	constructor(request: SupplyRequestBase) {
		this.requestId = request.requestId;
		// NOTE: Latency calculated immediately to capture time since request creation
		this.latencyMs = Date.now() - request.requestedAt;
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			requestId: this.requestId,
			latencyMs: this.latencyMs,
		};
	}
}
