import type { ZodClass } from '@n8n/api-types';
import type { BooleanLicenseFeature } from '@n8n/constants';
import type { Constructable } from '@n8n/di';
import type { ApiKeyScope, Scope } from '@n8n/permissions';
import type { RequestHandler, Router } from 'express';
import type { ZodTypeAny } from 'zod';

import type { KeyedRateLimiterConfig, RateLimiterLimits } from './rate-limit';

export type ApiKeyScopeRequirement =
	| ApiKeyScope
	| { anyOf: readonly ApiKeyScope[] }
	| { allOf: readonly ApiKeyScope[] };

export type ResponseDtoClass = Pick<ZodClass, 'parse'>;

/** Media types a binary `@ApiResponse` can declare. Add a type here to support it. */
export const BINARY_RESPONSE_MEDIA_TYPES = ['application/gzip'] as const;
export type BinaryResponseMediaType = (typeof BINARY_RESPONSE_MEDIA_TYPES)[number];

/** A response header documented on a binary `@ApiResponse`. */
export interface ResponseHeader {
	description: string;
}

/**
 * A success response whose body the controller method writes to `res` itself, instead of
 * returning a value for the registry to send as JSON.
 */
export interface BinaryResponse {
	mediaType: BinaryResponseMediaType;
	/** OpenAPI description of the success response. Defaults to 'Operation successful.'. */
	description?: string;
	/**
	 * Response headers the controller method must set before the body starts, keyed by header name.
	 * The framework checks that each one is set, and documents it in the spec.
	 */
	headers?: Record<string, ResponseHeader>;
}

export type SuccessStatus = 200 | 201 | 202 | 204;

export interface ErrorResponse {
	status: number;
	dto?: ResponseDtoClass;
	description?: string;
}

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

/** Multer limits for a `multipart/form-data` `@Body`. Every key matches multer's own `limits` option. */
export interface MultipartUploadLimits {
	fieldNameSize?: number;
	fieldSize?: number;
	fields?: number;
	fileSize?: number;
	files?: number;
	parts?: number;
	headerPairs?: number;
}

/**
 * Accepted options for `@Body` media type. This is where supported media types are first
 * registered.
 */
export interface RequestBodyMediaOptions {
	'application/json': object;
	'multipart/form-data': { uploadLimits: () => MultipartUploadLimits };
}

export type RequestBodyMediaType = keyof RequestBodyMediaOptions;

/** One request-body media type, tagged with `mediaType` and carrying that type's own options. */
export type RequestBodyMedia = {
	[K in RequestBodyMediaType]: { mediaType: K } & RequestBodyMediaOptions[K];
}[RequestBodyMediaType];

export type Arg =
	| { type: 'body'; required?: boolean; media?: RequestBodyMedia }
	| { type: 'query' }
	| { type: 'param'; key: string; schema?: ZodTypeAny };

export interface CorsOptions {
	allowedOrigins: string[];
	allowedMethods: Method[];
	allowedHeaders: string[];
	allowCredentials?: boolean;
	maxAge?: number;
}

export type HandlerName = string;

export interface AccessScope {
	scope: Scope;
	globalOnly: boolean;
}

export interface DeprecationInfo {
	/** When the endpoint became deprecated. Emitted as an RFC 9745 `Deprecation` header. */
	since: Date;
}

export interface RouteMetadata {
	method: Method;
	path: string;
	middlewares: RequestHandler[];
	usesTemplates: boolean;
	skipAuth: boolean;
	/** Whether to allow requests from bot user agents (e.g. Slackbot) */
	allowBots: boolean;
	allowSkipPreviewAuth: boolean;
	allowSkipMFA: boolean;
	allowUnauthenticated: boolean;
	apiKeyAuth: boolean;
	cors?: Partial<CorsOptions> | true;
	/** Whether to apply IP-based rate limiting to the route */
	ipRateLimit?: boolean | RateLimiterLimits;
	/** Whether to apply keyed rate limiting to the route */
	keyedRateLimit?: KeyedRateLimiterConfig;
	licenseFeature?: BooleanLicenseFeature;
	/** Public API only: gate the route on the instance being within its licensed users quota. */
	requiresUserQuota?: boolean;
	accessScope?: AccessScope;
	apiKeyScope?: ApiKeyScopeRequirement;
	responseDto?: ResponseDtoClass;
	/** Set when the controller method writes a binary body itself. Mutually exclusive with `responseDto`. */
	binaryResponse?: BinaryResponse;
	/** OpenAPI HTTP status sent on success, and documented as such. */
	successStatus?: SuccessStatus;
	/** OpenAPI operation summary. */
	summary?: string;
	/** OpenAPI operation description. */
	description?: string;
	/** OpenAPI operation tags. */
	tags?: string[];
	/** OpenAPI error responses. */
	errorResponses?: ErrorResponse[];
	/** OpenAPI deprecation; also emits an RFC 9745 `Deprecation` header at request time. */
	deprecated?: DeprecationInfo;
	args: Arg[];
	router?: Router;
}

/**
 * Metadata for static routers mounted on a controller.
 * Picks relevant fields from RouteMetadata and makes router required.
 */
export type StaticRouterMetadata = {
	path: string;
	router: Router;
} & Partial<
	Pick<
		RouteMetadata,
		| 'skipAuth'
		| 'allowSkipPreviewAuth'
		| 'allowSkipMFA'
		| 'middlewares'
		| 'ipRateLimit'
		| 'keyedRateLimit'
		| 'licenseFeature'
		| 'accessScope'
	>
>;

export interface ControllerMetadata {
	basePath: `/${string}`;
	// If true, the controller will be registered on the root path without the any prefix
	registerOnRootPath?: boolean;
	isPublicApi?: boolean;
	middlewares: HandlerName[];
	routes: Map<HandlerName, RouteMetadata>;
}

export type Controller = Constructable<object> &
	Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;
