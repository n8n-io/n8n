import type { RequestBodyMedia, RequestBodyMediaType } from '@n8n/decorators';
import type { Request, RequestHandler } from 'express';
import type { ZodError } from 'zod';

export interface RequestBodyHandler {
	/** The OpenAPI content key, and the `Content-Type` a route declaring this handler must match. */
	readonly mediaType: RequestBodyMediaType;
	/** Error statuses this media type can cause; documented on every route that declares it. */
	readonly errorStatuses: readonly number[];
	/** Whether `/discover` shows a request schema for a route declaring this media type. */
	readonly discoverable: boolean;
	/**
	 * Builds the middleware that checks `Content-Type` and parses the body into whatever shape
	 * `readInput` later reads back. The registry runs it after the auth/scope/license/quota gates and
	 * before controller and route middlewares.
	 */
	createMiddleware(media: RequestBodyMedia, bodyRequired: boolean): RequestHandler;
	/** The value the route's `@Body` DTO validates. */
	readInput(req: Request): unknown;
	/** The public message for a value that failed the `@Body` DTO's `.safeParse()`. */
	formatValidationError(error: ZodError): string;
}
