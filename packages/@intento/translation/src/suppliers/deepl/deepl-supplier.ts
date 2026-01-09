import type { IFunctions, SupplyError } from 'intento-core';
import type { IHttpRequestOptions, IntentoConnectionType } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/*';
import { TranslationResponse } from 'supply/*';
import { TranslationSupplierBase } from 'supply/translation-supplier-base';

import { DeeplDescriptor } from './deepl-descriptor';

export class DeeplSupplier extends TranslationSupplierBase {
	private readonly uri: string;

	constructor(connection: IntentoConnectionType, functions: IFunctions) {
		super(DeeplDescriptor, connection, functions);
		this.uri = 'https://api.deepl.com/v2';
	}

	protected async translate(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | SupplyError> {
		signal?.throwIfAborted();

		const body = new URLSearchParams();
		request.segments.forEach((segment) => body.append('text', segment.text));
		body.append('target_lang', request.to.toUpperCase());
		if (request.from) body.append('source_lang', request.from.toUpperCase());

		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${this.uri}/translate`,
			body: body.toString(),
		};

		const response = (await this.functions.helpers.httpRequestWithAuthentication.call(
			this.functions,
			DeeplDescriptor.credentials!,
			options,
		)) as { translations: Array<{ text: string; detected_source_language?: string }> };

		const translations = response.translations.map((item, index) => ({
			textPosition: request.segments[index].textPosition,
			segmentPosition: request.segments[index].segmentPosition,
			text: item.text,
			detectedLanguage: item.detected_source_language?.toLowerCase(),
		}));
		return new TranslationResponse(request, translations);
	}
}
