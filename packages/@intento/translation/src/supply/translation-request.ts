import type { AgentRequestBase } from 'intento-core';
import { SupplyRequestBase } from 'intento-core';
import type { ISegment } from 'intento-segmentation';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

export class TranslationRequest extends SupplyRequestBase {
	readonly segments: ISegment[];
	readonly to: string;
	readonly from?: string;

	constructor(request: AgentRequestBase, segments: ISegment[], to: string, from?: string) {
		super(request);

		this.segments = segments;
		this.to = to;
		this.from = from;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (!this.to || this.to.trim() === '') throw new Error('"to" is required');
		if (this.segments.length === 0) throw new Error('"segments" must contain at least one segment to translate.');
		super.throwIfInvalid();
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
			from: this.from,
			to: this.to,
			segments: this.segments,
		};
	}
}
