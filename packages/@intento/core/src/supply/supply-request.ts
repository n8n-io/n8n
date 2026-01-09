import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { IDataProvider, ITraceable, IValidatable } from 'types/*';

export class SupplyRequest implements ITraceable, IDataProvider, IValidatable {
	readonly requestId: string;
	readonly requestedAt: number;

	constructor() {
		this.requestId = crypto.randomUUID();
		this.requestedAt = Date.now();
	}

	throwIfInvalid(): void {}

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
