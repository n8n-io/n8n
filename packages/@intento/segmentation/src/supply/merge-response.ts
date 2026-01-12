import { SupplyResponseBase } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { MergeRequest } from 'supply/merge-request';
import type { ISegment } from 'types/*';

/**
 * Response containing merged text reconstructed from segments.
 *
 * Validates that the number of merged text items matches the expected count
 * based on segment textPosition values (zero-based indices). Each unique
 * textPosition should produce exactly one merged text item.
 */
export class MergeResponse extends SupplyResponseBase {
	readonly segments: ISegment[];
	readonly text: string[];

	constructor(request: MergeRequest, text: string[]) {
		super(request);

		this.text = text;
		this.segments = request.segments;

		this.throwIfInvalid();

		Object.freeze(this);
	}

	/**
	 * Validates that merged text count matches expected count from segments.
	 *
	 * Ensures correspondence between input segments and output text by verifying
	 * text.length equals the number of unique text positions. Since textPosition
	 * is zero-based (0, 1, 2...), expected count is max textPosition + 1.
	 *
	 * @throws Error if text count doesn't match expected count from segments
	 */
	throwIfInvalid(): void {
		if (this.segments.length === 0 && this.text.length === 0) return;
		const textCount = Math.max(...this.segments.map((segment) => segment.textPosition));
		if (this.text.length !== textCount + 1)
			throw new Error(`Text length ${this.text.length} does not match expected count ${textCount + 1} - one per input text item`);
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
			...super.asDataObject(),
			segments: this.segments,
			text: this.text,
		};
	}
}
