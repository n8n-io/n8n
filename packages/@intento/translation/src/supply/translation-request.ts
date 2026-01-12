import { SupplyRequestBase } from 'intento-core';
import type { ISegment } from 'intento-segmentation';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

export class TranslationRequest extends SupplyRequestBase {
	readonly segments: ISegment[];
	readonly to: string;
	readonly from?: string;

	constructor(segments: ISegment[], to: string, from?: string) {
		super();

		this.segments = segments;
		this.to = to;
		this.from = from;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (!this.to || this.to.trim() === '') throw new Error('targetLanguage is required');
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			from: this.from,
			to: this.to,
			segmentsCount: this.segments.length,
		};
	}

	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			from: this.from,
			to: this.to,
			segments: this.segments,
		};
	}
}
