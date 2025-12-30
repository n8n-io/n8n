import { SupplyErrorBase } from 'intento-core';
import type { LogMetadata, INodeExecutionData, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';

export class TranslationError extends SupplyErrorBase {
	readonly from?: string;
	readonly to: string;
	readonly text: string;

	constructor(request: TranslationRequest, code: number, reason: string) {
		super(request, code, reason);
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

	asExecutionData(): INodeExecutionData[][] {
		return [
			[
				{
					json: {
						requestId: this.requestId,
						from: this.from,
						to: this.to,
						text: this.text,
						errorCode: this.code,
						errorReason: this.reason,
						latencyMs: this.latencyMs,
					},
				},
			],
		];
	}

	asError(node: INode): NodeOperationError {
		const message = `🌍 Translation has been failed: [${this.code}] ${this.reason}`;
		return new NodeOperationError(node, message);
	}
}
