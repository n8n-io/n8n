import { SupplyRequest } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { ITranslation } from 'types/*';

export class MergeRequest extends SupplyRequest {
	readonly translations: ITranslation[];

	constructor(translations: ITranslation[]) {
		super();
		this.translations = translations;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			translationsCount: this.translations.length,
		};
	}
	asDataObject(): IDataObject {
		return {
			...super.asDataObject(),
			translations: this.translations,
		};
	}
}
