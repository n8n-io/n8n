import { SupplyResponseBase } from 'intento-core';
import type { ISegment } from 'intento-segmentation';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';
import type { ITranslation } from 'types/*';

export class TranslationResponse extends SupplyResponseBase {
	readonly segments: ISegment[];
	readonly translations: ITranslation[];
	readonly to: string;
	readonly from?: string;

	constructor(request: TranslationRequest, translations: ITranslation[]) {
		super(request);
		this.from = request.from;
		this.to = request.to;
		this.segments = request.segments;
		this.translations = translations;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.translations.length !== this.segments.length) throw new Error(`"translations" must contain ${this.segments.length} items`);
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			from: this.from,
			to: this.to,
			segmentsCount: this.segments.length,
			translationCount: this.translations.length,
		};
	}

	asDataObject(): IDataObject {
		return {
			from: this.from,
			to: this.to,
			segments: this.segments,
			translations: this.translations,
		};
	}
}
