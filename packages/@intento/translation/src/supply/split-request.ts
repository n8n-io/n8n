import type { Text } from 'intento-core';
import { SupplyRequest } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

export class SplitRequest extends SupplyRequest {
	readonly text: Text;
	readonly segmentLimit: number;
	readonly from?: string;

	constructor(text: Text, segmentLimit: number, from?: string) {
		super();
		this.text = text;
		this.segmentLimit = segmentLimit;
		this.from = from;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.segmentLimit <= 0) throw new Error('Segment limit must be a positive integer.');
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
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
