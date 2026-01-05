import { SupplyErrorBase } from 'intento-core';
import type { LogMetadata, INodeExecutionData, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { TranslationRequest } from 'supply/translation-request';

/**
 * Represents a translation operation failure.
 *
 * Immutable error object containing original request context plus error details.
 * Used for both supplier-level errors (API failures, rate limits) and validation errors.
 */
export class TranslationError extends SupplyErrorBase {
	/** Source language from failed request */
	readonly from?: string;
	/** Target language from failed request */
	readonly to: string;
	/** Original text that failed to translate */
	readonly text: string;

	/**
	 * Creates a translation error from failed request.
	 *
	 * @param request - Original translation request that failed
	 * @param code - Error code (typically HTTP status or custom error code)
	 * @param reason - Human-readable error description
	 */
	constructor(request: TranslationRequest, code: number, reason: string) {
		super(request, code, reason);
		this.from = request.from;
		this.to = request.to;
		this.text = request.text;

		Object.freeze(this);
	}

	/**
	 * Converts error to structured log metadata format.
	 *
	 * @returns Metadata object for structured logging, excluding text content to prevent log bloat
	 */
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
