export type HttpMethodV1 = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface HttpRequestV1 {
	method: HttpMethodV1;
	path: string;
	params: Record<string, string>;
	query: Record<string, string | string[] | undefined>;
	headers: Record<string, string | string[] | undefined>;
	/** Parsed JSON body, or `undefined` if the request has no JSON body. */
	body: unknown;
}

export interface HttpResponseV1 {
	status: number;
	headers?: Record<string, string>;
	/** Sent as JSON. */
	body?: unknown;
}

export interface HttpRouteV1 {
	method: HttpMethodV1;
	/** Absolute path, for example `/cloud/admin/limits`. Supports `:param` segments. */
	path: string;
	/**
	 * n8n does not authenticate these routes. The handler must check
	 * the caller itself.
	 */
	handler: (request: HttpRequestV1) => Promise<HttpResponseV1>;
}

export interface HttpApiV1 {
	readonly version: 1;

	registerRoute(route: HttpRouteV1): void;
}
