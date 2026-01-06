import type { IDescriptor, IFunctions } from 'intento-core';
import { SupplierBase } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { TranslationError } from 'supply/translation-error';
import type { TranslationRequest } from 'supply/translation-request';
import type { TranslationResponse } from 'supply/translation-response';

/**
 * Base class for translation service suppliers.
 *
 * Extends generic SupplierBase with translation-specific request/response/error types.
 * All translation suppliers must inherit from this class to ensure consistent API contracts
 * and enable polymorphic handling of different translation providers.
 */
export abstract class TranslationSupplierBase extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {
	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
	}

	protected onError(request: TranslationRequest, error: Error): TranslationError {
		if (error instanceof NodeApiError) {
			const code = Number.parseInt(error.httpCode ?? '0');
			const reason = `🔌 [API] Supplier '${this.descriptor.name}' has failed to supply because of an API error: ${error.httpCode} - ${error.message || 'Unknown API error'}`;
			const isRetriable = code >= 500 || code === 429;
			const result = new TranslationError(request, code, reason, isRetriable);
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
			const result = new TranslationError(request, 0, reason, false);
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
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			const reason = `⏰ [Timeout] Supplier '${this.descriptor.name}' reached the execution timed out. Please consider increasing the node timeout limit.`;
			const result = new TranslationError(request, 408, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		if (error instanceof DOMException && error.name === 'AbortError') {
			const reason = `⏰ [Abort] Supplier '${this.descriptor.name}' was not able to complete the execution before the abort.`;
			const result = new TranslationError(request, 408, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		const reason = `🐞 [Bug] Supplier '${this.descriptor.name}' encountered an unexpected error: ${error.message}`;
		const result = new TranslationError(request, 500, reason, false);
		const meta = { result: result.asLogMetadata(), source: error };
		this.tracer.error(reason, meta);
		return result;
	}
}
