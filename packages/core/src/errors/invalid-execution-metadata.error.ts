import { ApplicationError } from '@n8n/errors';

export class InvalidExecutionMetadataError extends ApplicationError {
	constructor(
		public type: 'key' | 'value',
		key: unknown,
		message?: string,
		options?: ErrorOptions,
	) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		super(message ?? `Custom data ${type}s must be a string (key "${key}")`, options);
	}
}
