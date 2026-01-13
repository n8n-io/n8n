import type { AgentRequestBase } from 'intento-core';
import { SupplyRequestBase } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

/**
 * Request for splitting text into segments with specified limit per item.
 *
 * Used by segmentation suppliers to split large texts before translation.
 * Each text item processed independently to preserve context boundaries.
 */
export class SplitRequest extends SupplyRequestBase {
	readonly text: string[];
	readonly segmentLimit: number;
	readonly from?: string;

	/**
	 * Creates immutable split request with text items and segment limit.
	 *
	 * @param request - Parent agent request for correlation tracking
	 * @param text - Text items to split (must contain at least one item)
	 * @param segmentLimit - Maximum segments per text item (must be positive)
	 * @param from - Optional source language code for context-aware splitting
	 */
	constructor(request: AgentRequestBase, text: string[], segmentLimit: number, from?: string) {
		super(request);

		this.text = text;
		this.segmentLimit = segmentLimit;
		this.from = from;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.text.length === 0) throw new Error('"text" must contain at least one item.');
		if (this.segmentLimit <= 0) throw new Error('"segmentLimit" must be a positive number.');
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			textCount: this.text.length,
			segmentLimit: this.segmentLimit,
			from: this.from,
		};
	}

	asDataObject(): IDataObject {
		return {
			text: this.text,
			segmentLimit: this.segmentLimit,
			from: this.from,
		};
	}
}
