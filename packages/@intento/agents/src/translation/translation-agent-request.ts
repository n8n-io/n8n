import { AgentRequestBase } from 'intento-core';
import type { TranslationContext } from 'intento-translation';
import type { IDataObject, LogMetadata } from 'n8n-workflow';

export class TranslationAgentRequest extends AgentRequestBase {
	readonly text: string[];
	readonly to: string;
	readonly from?: string;

	constructor(context: TranslationContext) {
		super();

		this.text = context.text;
		this.to = context.to;
		this.from = context.from;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (!this.to || this.to.trim() === '') throw new Error('"to" is required');
		if (this.text.length === 0) throw new Error('"text" must contain at least one string to translate.');
		const wrongText = this.text.filter((t) => t === null || t === undefined);
		if (wrongText.length > 0) throw new Error('"text" contains invalid string (null or undefined).');
		super.throwIfInvalid();
	}

	asLogMetadata(): LogMetadata {
		return {
			...super.asLogMetadata(),
			from: this.from,
			to: this.to,
			textCount: this.text.length,
		};
	}

	asDataObject(): IDataObject {
		return {
			from: this.from,
			to: this.to,
			text: this.text,
		};
	}
}
