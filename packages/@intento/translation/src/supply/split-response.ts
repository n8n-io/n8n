import type { Text } from 'intento-core';
import { SupplyResponse } from 'intento-core';
import type { IDataObject } from 'n8n-workflow';

import type { SplitRequest } from 'supply/split-request';
import type { ISegment } from 'types/*';

export class SplitResponse extends SupplyResponse {
	readonly text: Text;
	readonly segments: ISegment[];

	constructor(request: SplitRequest, segments: ISegment[]) {
		super(request);
		this.text = request.text;
		this.segments = segments;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		const minSize = Array.isArray(this.text) ? this.text.length : 1;
		if (this.segments.length < minSize) throw new Error(`Segments response must contain at least ${minSize} segments.`);
		super.throwIfInvalid();
	}

	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			text: this.text,
			segments: this.segments,
		};
	}
}
