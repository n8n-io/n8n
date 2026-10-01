import type { RequestBodyMedia, RequestBodyMediaType } from '@n8n/decorators';
import type { Request, RequestHandler } from 'express';
import type { ZodError } from 'zod';

/**
 * One request-body media type's behaviour: how to recognize it, parse it, and document it. Every
 * concern that varies by media type lives behind this interface - the registry, resolver, generator
 * and `/discover` read it through `REQUEST_BODY_HANDLERS` (see `./index.ts`) and never branch on
 * `mediaType` themselves. Adding a media type means adding a handler here, not touching those call
 * sites.
 */
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
	 * before controller and route middlewares, so a caller rejected by those never has their body
	 * parsed. It reports its own errors via `sendPublicApiErrorResponse` and calls `next()` with no
	 * argument on success - it never forwards an error to Express's own `next`.
	 */
	createMiddleware(media: RequestBodyMedia, bodyRequired: boolean): RequestHandler;
	/** The value the route's `@Body` DTO validates. */
	readInput(req: Request): unknown;
	/** The public message for a value that failed the `@Body` DTO's `.safeParse()`. */
	formatValidationError(error: ZodError): string;
}
