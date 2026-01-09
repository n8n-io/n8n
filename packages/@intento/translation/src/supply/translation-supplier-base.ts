import { SupplierBase, SupplyError, type IDescriptor, type IFunctions } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';
import type { TranslationResponse } from 'supply/translation-response';

export abstract class TranslationSupplierBase extends SupplierBase<TranslationRequest, TranslationResponse> {
	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
	}

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
