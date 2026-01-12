import type { Text } from 'intento-core';
import { SupplyResponseBase } from 'intento-core';
import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { SplitRequest } from 'supply/split-request';
import type { ISegment } from 'types/*';

/**
 * Response containing text segments produced by split operation.
 *
 * Maintains reference to original text for validation and merging operations.
 * Ensures at least one segment exists per input text item to maintain
 * correspondence between original and segmented data.
 */
export class SplitResponse extends SupplyResponseBase {
	readonly text: Text;
	readonly segments: ISegment[];

	constructor(request: SplitRequest, segments: ISegment[]) {
		super(request);
		this.text = request.text;
		this.segments = segments;

		this.throwIfInvalid();

		Object.freeze(this);
	}

	/**
	 * Validates segment count matches input text count.
	 *
	 * Ensures at least one segment per text item to maintain correspondence
	 * for subsequent merge operations. Empty text items should still produce
	 * at least one segment.
	 *
	 * @throws Error if segments.length < text.length
	 */
	throwIfInvalid(): void {
		const minSize = Array.isArray(this.text) ? this.text.length : 1;
		if (this.segments.length < minSize)
			throw new Error(`Segments response must contain at least ${minSize} segment(s) - one per input text item.`);
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			segmentsCount: this.segments.length,
			textCount: Array.isArray(this.text) ? this.text.length : 1,
		};
	}

	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			text: this.text,
			segments: this.segments,
		};
	}
}
