/**
 * Stub error classes for trigger-service
 * These match the error classes from CLI but are simplified for the stub
 */

export class ResponseError extends Error {
	public readonly httpStatusCode: number;
	public readonly errorCode?: number;
	public readonly hint?: string;
	public readonly meta?: Record<string, unknown>;

	constructor(message: string, httpStatusCode: number = 500, errorCode?: number) {
		super(message);
		this.name = this.constructor.name;
		this.httpStatusCode = httpStatusCode;
		this.errorCode = errorCode;
	}
}

export class NotFoundError extends ResponseError {
	constructor(message: string) {
		super(message, 404);
	}
}

export class ConflictError extends ResponseError {
	constructor(message: string) {
		super(message, 409);
	}
}

export class BadRequestError extends ResponseError {
	constructor(message: string) {
		super(message, 400);
	}
}

export class InternalServerError extends ResponseError {
	constructor(message: string) {
		super(message, 500);
	}
}

export class UnprocessableError extends ResponseError {
	constructor(message: string) {
		super(message, 422);
	}
}

export class WebhookNotFoundError extends ResponseError {
	constructor(
		_webhookData: { path?: string; httpMethod?: string; webhookMethods?: string[] },
		_options?: { hint?: string },
	) {
		super('Webhook not found', 404);
	}
}

export class WorkflowMissingIdError extends Error {
	constructor(_workflow: unknown) {
		super('Workflow is missing an ID');
	}
}

export class UnprocessableRequestError extends ResponseError {
	constructor(message: string, details?: string) {
		super(details ? `${message}: ${details}` : message, 422);
	}
}

export class ServiceUnavailableError extends ResponseError {
	constructor(message: string) {
		super(message, 503);
	}
}
