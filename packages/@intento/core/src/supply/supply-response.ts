import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { SupplyRequest } from 'supply/supply-request';
import type { IDataProvider, ITraceable, IValidatable } from 'types/*';

export class SupplyResponse implements ITraceable, IDataProvider, IValidatable {
	readonly requestId: string;
	readonly latencyMs: number;

	constructor(request: SupplyRequest) {
		this.requestId = request.requestId;
		this.latencyMs = Date.now() - request.requestedAt;
	}

	throwIfInvalid(): void {}

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
