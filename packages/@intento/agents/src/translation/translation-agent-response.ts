import { AgentResponseBase } from 'intento-core';
import type { IDataObject } from 'n8n-workflow';

import type { TranslationAgentRequest } from 'translation/translation-agent-request';

export class TranslationAgentResponse extends AgentResponseBase {
	readonly text: string[];
	readonly to: string;
	readonly from?: string;
	readonly detectedLanguages: string[];

	constructor(request: TranslationAgentRequest, translatedText: string[], detectedLanguages: string[]) {
		super(request);

		this.text = translatedText;
		this.to = request.to;
		this.from = request.from;
		this.detectedLanguages = detectedLanguages;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (!this.to || this.to.trim() === '') throw new Error('"to" is required');
		if (this.text.length === 0) throw new Error('"text" must contain at least one translated string.');
		super.throwIfInvalid();
	}

	asDataObject(): IDataObject {
		return {
			from: this.from,
			to: this.to,
			text: this.text,
			detectedLanguages: this.detectedLanguages,
		};
	}
}
