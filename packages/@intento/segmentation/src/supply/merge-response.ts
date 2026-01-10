import { SupplyResponse } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { MergeRequest } from 'supply/merge-request';

export class MergeResponse extends SupplyResponse {
	readonly text: string[];

	constructor(request: MergeRequest, text: string[]) {
		super(request);
		this.text = text;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			textCount: this.text.length,
		};
	}
	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			text: this.text,
		};
	}
}
