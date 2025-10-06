import { OperationalError } from 'n8n-workflow';
import type { OperationalErrorOptions } from 'n8n-workflow';

/**
 * Error thrown when the LLM service fails
 */
export class LLMServiceError extends OperationalError {
	constructor(
		message: string,
		options?: OperationalErrorOptions & { llmModel?: string; statusCode?: number },
	) {
		super(message, {
			...options,
			tags: {
				...options?.tags,
				llmModel: options?.llmModel,
				statusCode: options?.statusCode,
			},
			shouldReport: true,
		});
	}
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends OperationalError {
	constructor(
		message: string,
		options?: OperationalErrorOptions & { field?: string; value?: unknown },
	) {
		super(message, {
			...options,
			tags: {
				...options?.tags,
				field: options?.field,
			},
			extra: {
				...options?.extra,
				value: options?.value,
			},
			shouldReport: false,
		});
	}
}
