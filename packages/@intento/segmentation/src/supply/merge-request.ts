import { SupplyRequest } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { ISegment } from 'types/*';

export class MergeRequest extends SupplyRequest {
	readonly segments: ISegment[];

	constructor(segments: ISegment[]) {
		super();
		this.segments = segments;
		Object.freeze(this);
	}

	throwIfInvalid(): void {
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			segmentsCount: this.segments.length,
		};
	}
	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			segments: this.segments,
		};
	}
}
