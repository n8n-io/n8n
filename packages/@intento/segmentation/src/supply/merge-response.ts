import { SupplyResponseBase } from 'intento-core';
import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { MergeRequest } from 'supply/merge-request';
import type { ISegment } from 'types/*';

/**
 * Response from merging text segments back into complete text items.
 *
 * Contains reassembled text array where textPosition determines array index.
 * Validates text array size matches highest textPosition + 1 to prevent data loss.
 */
export class MergeResponse extends SupplyResponseBase {
	readonly segments: ISegment[];
	readonly text: string[];

	/**
	 * Creates immutable merge response with reassembled text items.
	 *
	 * @param request - Originating merge request containing segments for correlation
	 * @param text - Reassembled text items (array length must equal max textPosition + 1)
	 */
	constructor(request: MergeRequest, text: string[]) {
		super(request);

		this.text = text;
		this.segments = request.segments;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.segments.length === 0) throw new Error('"segments" must contain at least one item.');
		if (this.text.length === 0) throw new Error('"text" must contain at least one item.');
		const textCount = Math.max(...this.segments.map((segment) => segment.textPosition));
		if (this.text.length !== textCount + 1) throw new Error(`"text" must contain exactly ${textCount + 1} items.`);
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
			segments: this.segments,
			text: this.text,
		};
	}
}
