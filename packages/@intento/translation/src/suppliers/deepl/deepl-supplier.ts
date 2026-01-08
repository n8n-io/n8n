import type { IFunctions } from 'intento-core';
import type { IHttpRequestOptions, IntentoConnectionType } from 'n8n-workflow';

import type { TranslationError, TranslationRequest, TranslationResponse } from 'supply/*';
import { TranslationSupplierBase } from 'supply/translation-supplier-base';

import { DeeplDescriptor } from './deepl-descriptor';

export class DeeplSupplier extends TranslationSupplierBase {
	private readonly uri: string;
	private headers: Record<string, string>;

	constructor(connection: IntentoConnectionType, functions: IFunctions) {
		super(DeeplDescriptor, connection, functions);
		this.uri = 'https://api.deepl.com/v2';
		this.headers = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/x-www-form-urlencoded',
		};
	}

	protected async execute(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
		signal?.throwIfAborted();

		const body = {
			text: request.text,
			target_lang: request.to,
		};

		const options: IHttpRequestOptions = {
			method: 'POST',
			headers: this.headers,
			url: `${this.uri}/translate`,
			body,
		};

		const response = (await this.functions.helpers.httpRequestWithAuthentication.call(
			this.functions,
			DeeplDescriptor.credentials,
			options,
		)) as unknown;

		throw new Error('Method not implemented.');
	}
}
