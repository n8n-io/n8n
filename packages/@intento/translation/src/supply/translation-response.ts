import { SupplyResponseBase } from 'intento-core';
import type { ISegment } from 'intento-segmentation';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';
import type { ITranslation } from 'types/*';

export class TranslationResponse extends SupplyResponseBase {
	readonly from?: string;
	readonly to: string;
	readonly segments: ISegment[];
	readonly translations: ITranslation[];

	constructor(request: TranslationRequest, translations: ITranslation[]) {
		super(request);
		this.from = request.from;
		this.to = request.to;
		this.segments = request.segments;
		this.translations = translations;
	}

	throwIfInvalid(): void {
		if (this.translations.length !== this.segments.length) throw new Error('Number of translations does not match number of segments');
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			from: this.from,
			to: this.to,
			translationCount: this.translations.length,
		};
	}

	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			from: this.from,
			to: this.to,
			translation: this.translations,
		};
	}
}
