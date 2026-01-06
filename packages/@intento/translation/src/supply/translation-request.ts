import type { Text } from 'intento-core';
import { SupplyRequestBase } from 'intento-core';
import type { LogMetadata, IDataObject } from 'n8n-workflow';

export class TranslationRequest extends SupplyRequestBase {
	readonly text: Text;
	readonly to: string;
	readonly from?: string;

	constructor(text: Text, to: string, from?: string) {
		super();
		this.text = text;
		this.to = to;
		this.from = from;

		this.throwIfInvalid();
		Object.freeze(this);
	}

	protected throwIfInvalid(): void {
		if (!this.to || this.to.trim() === '') throw new Error('targetLanguage is required');
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			from: this.from,
			to: this.to,
			requestedAt: this.requestedAt,
		};
	}
	asDataObject(): IDataObject {
		return {
			from: this.from,
			to: this.to,
			text: this.text,
			requestedAt: this.requestedAt,
		};
	}

	clone(): this {
		return new TranslationRequest(this.text, this.to, this.from) as this;
	}
}
