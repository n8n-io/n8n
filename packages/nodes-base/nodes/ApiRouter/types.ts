import type { IHttpRequestMethods } from 'n8n-workflow';

export const ALL_METHODS: IHttpRequestMethods[] = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'];

/** Response modes the node offers. `auto` is resolved per request by the platform. */
export type ApiRouterResponseMode =
	| 'auto'
	| 'onReceived'
	| 'lastNode'
	| 'responseNode'
	| 'streaming';

export type ApiRouterEndpoint = {
	name?: string;
	method: IHttpRequestMethods;
	path: string;
	authentication?: 'inherit' | 'none';
	responseMode?: 'inherit' | ApiRouterResponseMode;
	/** JSON Schema for the request body, as authored or produced by an OpenAPI import. */
	requestSchema?: string;
};

export type ApiRouterOptions = {
	fallbackOutput?: boolean;
	catchAllDepth?: number;
	validateRequests?: boolean;
	validationErrorsToFallback?: boolean;
	serveSpec?: boolean;
	specTitle?: string;
	specVersion?: string;
	allowedOrigins?: string;
	ipWhitelist?: string;
	rawBody?: boolean;
	binaryPropertyName?: string;
};

/**
 * One entry of the webhook description's `routes` array. Structurally an
 * `IWebhookRoute`, but declared as a type alias so it satisfies the
 * `INodeParameters` constraint that `fromFunction` imposes on its return value.
 */
export type RouteSpec = {
	name: string;
	path: string;
	httpMethod: string | string[];
	responseMode?: string;
};

export type ApiRouterParameters = {
	basePath?: string;
	endpoints?: { endpoint?: ApiRouterEndpoint[] };
	authentication?: string;
	responseMode?: ApiRouterResponseMode;
	options?: ApiRouterOptions;
	/**
	 * The node's own uuid, if the platform exposes it to description resolvers.
	 * It is the namespace fallback when `basePath` is empty.
	 */
	__webhookId?: string;
};

export const DEFAULT_CATCH_ALL_DEPTH = 6;

/** Reserved route name for the self-served OpenAPI document. */
export const SPEC_ROUTE_NAME = 'spec';
export const SPEC_PATH = 'openapi.json';

export const ENDPOINT_ROUTE_PREFIX = 'ep:';
export const CATCH_ALL_ROUTE_PREFIX = 'catchall:';
