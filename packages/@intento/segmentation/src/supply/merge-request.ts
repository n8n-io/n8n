import { SupplyRequestBase } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { ISegment } from 'types/*';

/**
 * Request to merge segments back into complete text items.
 *
 * Used in translation workflows to reconstruct full text from translated segments,
 * reversing the split operation by combining segments based on their textPosition.
 */
export class MergeRequest extends SupplyRequestBase {
	readonly segments: ISegment[];

	constructor(segments: ISegment[]) {
		super();

		this.segments = segments;

		Object.freeze(this);
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
