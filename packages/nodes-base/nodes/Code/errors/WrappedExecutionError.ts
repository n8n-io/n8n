import { ApplicationError } from '@n8n/errors';

export type WrappableError = Record<string, unknown>;

/**
 * Errors received from the task runner are not instances of Error.
 * This class wraps them in an Error instance and makes all their
 * properties available.
 */
export class WrappedExecutionError extends ApplicationError {
	[key: string]: unknown;

	constructor(error: WrappableError) {
		const message = typeof error.message === 'string' ? error.message : 'Unknown error';
		super(message, {
			cause: error,
		});

		this.copyErrorProperties(error);
	}

	private copyErrorProperties(error: WrappableError) {
		for (const key of Object.getOwnPropertyNames(error)) {
			this[key] = error[key];
		}
	}
}

export function isWrappableError(error: unknown): error is WrappableError {
	return typeof error === 'object' && error !== null;
}
