import type { Text } from 'intento-core';
import { SupplyErrorBase } from 'intento-core';
import type { LogMetadata, INode, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';

export class TranslationError extends SupplyErrorBase {
	readonly from?: string;
	readonly to: string;
	readonly text: Text;

	constructor(request: TranslationRequest, code: number, reason: string, isRetriable: boolean) {
		super(request, code, reason, isRetriable);
		this.from = request.from;
		this.to = request.to;
		this.text = request.text;

		Object.freeze(this);
	}

	asLogMetadata(): LogMetadata {
		return {
			requestId: this.requestId,
			from: this.from,
			to: this.to,
			errorCode: this.code,
			errorReason: this.reason,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			from: this.from,
			to: this.to,
			text: this.text,
			errorCode: this.code,
			errorReason: this.reason,
			latencyMs: this.latencyMs,
		};
	}

	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, this.reason);
	}
}
