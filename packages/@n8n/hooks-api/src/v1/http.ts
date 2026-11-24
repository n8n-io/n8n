import type { SecurityContextV1 } from './security';

export type HttpMethodV1 = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface HttpRequestV1 {
	method: HttpMethodV1;
	path: string;
	params: Record<string, string>;
	query: Record<string, string | string[] | undefined>;
	headers: Record<string, string | string[] | undefined>;
	/** Parsed JSON body, or `undefined` if the request has no JSON body. */
	body: unknown;
	/** Set once `sessionAuthentication` ran. Absent before it, and on routes without it. */
	security?: SecurityContextV1;
}

export interface HttpResponseV1 {
	status: number;
	headers?: Record<string, string>;
	/** Sent as JSON. */
	body?: unknown;
}

/** A middleware that n8n provides. Opaque: get it from `HttpApiV1.middlewares`. */
export interface HttpMiddlewareV1 {
	readonly name: string;
}

export interface HttpMiddlewaresV1 {
	/** Authenticates the caller as an n8n user, like the editor's REST routes, MFA enforcement included. Sets `request.security`. */
	readonly sessionAuthentication: HttpMiddlewareV1;
	/** Requires a global scope, for example `'workflow:list'`. Put `sessionAuthentication` before it. */
	requireGlobalScope(scope: string): HttpMiddlewareV1;
}

/** Runs before the handler. Return a response to end the request, or `undefined` to continue. */
export type HttpMiddlewareFnV1 = (request: HttpRequestV1) => Promise<HttpResponseV1 | undefined>;

export interface HttpRouteV1 {
	method: HttpMethodV1;
	/** Absolute path, for example `/cloud/admin/limits`. Supports `:param` segments. */
	path: string;
	/** Applied in array order before the handler. Empty: n8n does not authenticate; the handler checks the caller. */
	middlewares: Array<HttpMiddlewareV1 | HttpMiddlewareFnV1>;
	handler: (request: HttpRequestV1) => Promise<HttpResponseV1>;
}

export interface HttpApiV1 {
	readonly version: 1;

	readonly middlewares: HttpMiddlewaresV1;
	registerRoute(route: HttpRouteV1): void;
}
