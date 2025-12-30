import { SupplyResponseBase } from 'intento-core';
import type { LogMetadata, INodeExecutionData } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';

export class TranslationResponse extends SupplyResponseBase {
	readonly from?: string;
	readonly to: string;
	readonly text: string;
	readonly translation: string;
	readonly detectedLanguage?: string;

	constructor(request: TranslationRequest, translation: string, detectedLanguage?: string) {
		super(request);
		this.from = request.from;
		this.to = request.to;
		this.text = request.text;
		this.translation = translation;
		this.detectedLanguage = detectedLanguage;
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			from: this.from,
			to: this.to,
			detectedLanguage: this.detectedLanguage,
			latencyMs: this.latencyMs,
		};
	}

	asExecutionData(): INodeExecutionData[][] {
		return [
			[
				{
					json: {
						requestId: this.requestId,
						from: this.from,
						to: this.to,
						text: this.text,
						translation: this.translation,
						detectedLanguage: this.detectedLanguage,
						latencyMs: this.latencyMs,
					},
				},
			],
		];
	}
}
