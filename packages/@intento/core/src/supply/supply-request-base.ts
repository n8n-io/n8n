import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { IDataProvider, ITraceable } from 'types/*';

/**
 * Base class for supply operation requests with unique ID and timestamp tracking.
 *
 * Automatically generates a unique request ID and captures creation timestamp
 * for tracing and latency measurement. Subclasses should call super() first,
 * then add domain-specific request parameters.
 */
export abstract class SupplyRequestBase implements ITraceable, IDataProvider {
	readonly requestId: string;
	readonly requestedAt: number;

	constructor() {
		this.requestId = crypto.randomUUID();
		// NOTE: Timestamp captured at construction for accurate latency calculation in response
		this.requestedAt = Date.now();
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			requestedAt: this.requestedAt,
		};
	}

	asDataObject(): IDataObject {
		return {
			requestId: this.requestId,
			requestedAt: this.requestedAt,
		};
	}
}
