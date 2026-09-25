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

export type SuccessStatus = 200 | 201 | 202 | 204;

export interface ErrorResponse {
	status: number;
	dto?: ResponseDtoClass;
	description?: string;
}

export interface ApiResponseOptions {
	/** Replaces the generated 'Operation successful.' description. */
	description?: string;
	/** Documents a non-JSON body, e.g. 'application/gzip'. The handler writes it to `res` itself. */
	binaryMediaType?: string;
	/** Response headers the route sets on success. Values are always strings. */
	headers?: Record<string, { description: string }>;
}

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

/** A route's request body media type. Defaults to `application/json` when unset. */
export type BodyMediaType = 'application/json' | 'multipart/form-data';

/** Multer limits for a `multipart/form-data` `@Body`. Every field is optional, as multer's are. */
export interface MultipartUploadLimits {
	fileSize?: number;
	files?: number;
	parts?: number;
	fields?: number;
	fieldSize?: number;
}

export type Arg =
	| {
			type: 'body';
			required?: boolean;
			mediaType?: BodyMediaType;
			/** Set only for a multipart body. Read once, when the registry activates the route. */
			uploadLimits?: () => MultipartUploadLimits;
	  }
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
	/** OpenAPI HTTP status sent on success, and documented as such. */
	successStatus?: SuccessStatus;
	/** Extra `@ApiResponse` options: custom description, response headers, or a binary body. */
	successResponse?: ApiResponseOptions;
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
