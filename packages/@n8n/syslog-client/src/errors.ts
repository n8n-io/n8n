import type { ZodIssue } from 'zod';

/**
 * Base error class for all syslog client errors.
 * Extends native Error with additional context.
 */
export class SyslogClientError extends Error {
	constructor(
		message: string,
		readonly code?: string,
		readonly cause?: Error,
	) {
		super(message);
		this.name = 'SyslogClientError';

		// Maintain proper prototype chain for instanceof checks
		Object.setPrototypeOf(this, SyslogClientError.prototype);

		// Capture stack trace, excluding constructor call from it
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

/**
 * Error thrown when client options validation fails.
 */
export class ValidationError extends SyslogClientError {
	constructor(
		message: string,
		readonly validationErrors: Array<{ path: string; message: string }>,
	) {
		super(message, 'VALIDATION_ERROR');
		this.name = 'ValidationError';
		Object.setPrototypeOf(this, ValidationError.prototype);
	}

	static fromZod(message: string, zodErrors: ZodIssue[]) {
		const errors = zodErrors.map((zodError) => ({
			path: zodError.path.join('.'),
			message: zodError.message,
		}));

		return new ValidationError(message, errors);
	}
}

/**
 * Error thrown when transport connection fails.
 */
export class ConnectionError extends SyslogClientError {
	constructor(message: string, cause?: Error) {
		super(message, 'CONNECTION_ERROR', cause);
		this.name = 'ConnectionError';
		Object.setPrototypeOf(this, ConnectionError.prototype);
	}
}

/**
 * Error thrown when transport operations fail (send/write).
 */
export class TransportError extends SyslogClientError {
	constructor(
		message: string,
		readonly transportType: string,
		cause?: Error,
	) {
		super(message, 'TRANSPORT_ERROR', cause);
		this.name = 'TransportError';
		Object.setPrototypeOf(this, TransportError.prototype);
	}
}

/**
 * Error thrown when timeout occurs.
 */
export class TimeoutError extends SyslogClientError {
	constructor(message: string = 'Connection timed out') {
		super(message, 'TIMEOUT_ERROR');
		this.name = 'TimeoutError';
		Object.setPrototypeOf(this, TimeoutError.prototype);
	}
}
