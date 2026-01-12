import type { Text } from 'intento-core';
import { SupplyRequestBase } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

/**
 * Request to split text into segments with maximum character limit.
 *
 * Used in translation workflows to divide long text into manageable segments
 * that respect the segmentLimit constraint for downstream processing.
 */
export class SplitRequest extends SupplyRequestBase {
	readonly text: Text;
	readonly segmentLimit: number;
	readonly from?: string;

	constructor(text: Text, segmentLimit: number, from?: string) {
		super();

		this.text = text;
		this.segmentLimit = segmentLimit;
		this.from = from;

		this.throwIfInvalid();

		Object.freeze(this);
	}

	/**
	 * Validates that segmentLimit is a positive integer.
	 *
	 * Ensures segments can be meaningfully created and prevents infinite loops
	 * or invalid processing in downstream split operations.
	 *
	 * @throws Error if segmentLimit is not a positive integer
	 */
	throwIfInvalid(): void {
		if (!Number.isInteger(this.segmentLimit) || this.segmentLimit <= 0) throw new Error('Segment limit must be more than zero.');
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
			...super.asDataObject(),
			text: this.text,
			segmentLimit: this.segmentLimit,
			from: this.from,
		};
	}
}
