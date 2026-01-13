import { SupplyResponseBase } from 'intento-core';
import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { SplitRequest } from 'supply/split-request';
import type { ISegment } from 'types/*';

/**
 * Response from text splitting operation with positional segment tracking.
 *
 * Maintains original text items alongside generated segments for validation and merging.
 * Each segment preserves textPosition for reconstruction after translation.
 *
 * Validation ensures at least one segment per text item to prevent data loss during merge.
 */
export class SplitResponse extends SupplyResponseBase {
	readonly text: string[];
	readonly segments: ISegment[];

	constructor(request: SplitRequest, segments: ISegment[]) {
		super(request);

		this.text = request.text;
		this.segments = segments;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		// NOTE: Must have at least one segment per text item - prevents merge errors when reconstructing original structure
		if (this.segments.length < this.text.length) throw new Error(`"segments" must contain at least ${this.text.length} segment(s).`);
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			segmentsCount: this.segments.length,
			textCount: this.text.length,
		};
	}

	asDataObject(): IDataObject {
		return {
			text: this.text,
			segments: this.segments,
		};
	}
}
