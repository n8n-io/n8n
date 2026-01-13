import type { AgentRequestBase } from 'intento-core';
import { SupplyRequestBase } from 'intento-core';
import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { ISegment } from 'types/*';

/**
 * Request for merging text segments back into complete text items.
 *
 * Used by segmentation suppliers to reassemble split segments after translation.
 * Segments must maintain textPosition ordering for correct reassembly.
 */
export class MergeRequest extends SupplyRequestBase {
	readonly segments: ISegment[];

	/**
	 * Creates immutable merge request with segments to reassemble.
	 *
	 * @param request - Parent agent request for correlation tracking
	 * @param segments - Segments to merge (must contain at least one item)
	 */
	constructor(request: AgentRequestBase, segments: ISegment[]) {
		super(request);

		this.segments = segments;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.segments.length === 0) throw new Error('"segments" must contain at least one item.');
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
			segments: this.segments,
		};
	}
}
