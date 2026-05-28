import type {
	EvaluationApiError as EvaluationApiErrorShape,
	EvaluationErrorCode,
} from '@n8n/api-types';

/**
 * Throwable wrapper around the wire-shape `EvaluationApiError` from `@n8n/api-types`.
 * Carries a typed `code` so the controller can map it onto an HTTP status without
 * losing the structured detail payload the frontend uses for localized copy.
 */
export class EvaluationApiError extends Error implements EvaluationApiErrorShape {
	readonly code: EvaluationErrorCode;

	readonly details?: EvaluationApiErrorShape['details'];

	constructor(
		code: EvaluationErrorCode,
		message?: string,
		details?: EvaluationApiErrorShape['details'],
	) {
		super(message ?? code);
		this.name = 'EvaluationApiError';
		this.code = code;
		this.details = details;
	}

	toResponse(): EvaluationApiErrorShape {
		return { code: this.code, message: this.message, details: this.details };
	}
}
