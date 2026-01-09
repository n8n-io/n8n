import { SupplyResponse } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';
import type { ISegment, ITranslation } from 'types/*';

export class TranslationResponse extends SupplyResponse {
	readonly from?: string;
	readonly to: string;
	readonly segments: ISegment[];
	readonly translation: ITranslation[];

	constructor(request: TranslationRequest, translation: ITranslation[]) {
		super(request);
		this.from = request.from;
		this.to = request.to;
		this.segments = request.segments;
		this.translation = translation;
	}

	throwIfInvalid(): void {}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			from: this.from,
			to: this.to,
			segmentsCount: this.segments.length,
			translationCount: this.translation.length,
		};
	}

	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			from: this.from,
			to: this.to,
			segments: this.segments,
			translation: this.translation,
		};
	}
}
