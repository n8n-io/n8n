import { SupplierBase, SupplyError, type IFunctions } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';
import { TranslationResponse } from 'supply/translation-response';
import type { ITranslationDescriptor } from 'types/*';

export abstract class TranslationSupplierBase extends SupplierBase<TranslationRequest, TranslationResponse> {
	readonly descriptor: ITranslationDescriptor;

	constructor(descriptor: ITranslationDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
		this.descriptor = descriptor;
	}

	protected async execute(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | SupplyError> {
		signal?.throwIfAborted();
		const from = !request.from || request.from === '' ? 'auto' : request.from.toLowerCase();
		const to = request.to.toLowerCase();
		this.tracer.debug(`🚚 [${this.descriptor.name}] Translating ${request.segments.length} segment(s) from '${from}' to '${to}'...`);
		// check if translation is needed
		if (request.segments.length === 0) return this.nothingToTranslate(request);
		if (from === to) return this.sameLanguage(request, from);
		// check if languages are supported
		const fromNeedCheck = from !== 'auto' && this.descriptor.knownLanguages.from.size > 0;
		const toNeedCheck = this.descriptor.knownLanguages.to.size > 0;
		if (fromNeedCheck && !this.descriptor.knownLanguages.from.has(from)) return this.unknownLanguage(request, 'from');
		if (toNeedCheck && !this.descriptor.knownLanguages.to.has(to)) return this.unknownLanguage(request, 'to');
		// Proceed with translation
		const result = await this.translate(request, signal);
		this.tracer.info(`🚚 [${this.descriptor.name}] Translated ${request.segments.length} segments from ${from} to ${to}.`);
		return result;
	}

	private nothingToTranslate(request: TranslationRequest): TranslationResponse {
		this.tracer.warn(`🚚 [${this.descriptor.name}] No segments to translate. Returning empty response.`);
		return new TranslationResponse(request, []);
	}

	private sameLanguage(request: TranslationRequest, from: string): TranslationResponse {
		this.tracer.warn(`🚚 [${this.descriptor.name}] Source and target languages are the same ('${from}'). Skipping translation.`);
		const translations = request.segments.map((segment) => ({
			textPosition: segment.textPosition,
			segmentPosition: segment.segmentPosition,
			text: segment.text,
			detectedLanguage: from,
		}));
		return new TranslationResponse(request, translations);
	}

	private unknownLanguage(request: TranslationRequest, sources: 'from' | 'to'): SupplyError {
		const lang = sources === 'from' ? request.from : request.to;
		const reason = `🚚 [${this.descriptor.name}] Unknown '${sources}' language code '${lang}'. Cannot proceed with translation.`;
		this.tracer.error(reason);
		return new SupplyError(request, 400, reason, false);
	}

	protected abstract translate(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | SupplyError>;

	protected onError(request: TranslationRequest, error: Error): SupplyError {
		if (error instanceof NodeApiError) {
			const code = Number.parseInt(error.httpCode ?? '0');
			const reason = `🔌 [API] Supplier '${this.descriptor.name}' has failed to supply because of an API error: ${error.httpCode} - ${error.message || 'Unknown API error'}`;
			const isRetriable = code >= 500 || code === 429;
			const result = new SupplyError(request, code, reason, isRetriable);
			const meta = {
				result: result.asLogMetadata(),
				error: {
					code: error.httpCode,
					description: error.description,
					response: error.errorResponse,
				},
				source: error,
			};
			this.tracer.info(reason, meta);
			return result;
		}
		if (error instanceof NodeOperationError) {
			const reason = `⚙️ [Configuration] Supplier '${this.descriptor.name}' encountered an operational error: ${error.message || 'Unknown node error'}. Please check your node configuration.`;
			const result = new SupplyError(request, 404, reason, false);
			const meta = {
				result: result.asLogMetadata(),
				error: {
					cause: error.cause,
					description: error.description,
					response: error.errorResponse,
				},
				source: error,
			};
			this.tracer.warn(reason, meta);
			return result;
		}
		return super.onError(request, error);
	}
}
