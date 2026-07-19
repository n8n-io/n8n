import type { ZodClass } from '@n8n/api-types';
import type { BooleanLicenseFeature } from '@n8n/constants';
import type { Constructable } from '@n8n/di';
import type { ApiKeyScope, Scope } from '@n8n/permissions';
import type { RequestHandler, Router } from 'express';

import type { KeyedRateLimiterConfig, RateLimiterLimits } from './rate-limit';

/**
 * API-key scope requirement for public API routes.
 * Use a string for a single scope, or `{ anyOf }` / `{ allOf }` for multiples
 * (bare arrays are rejected as ambiguous).
 */
export type ApiKeyScopeRequirement =
	| ApiKeyScope
	| { anyOf: readonly ApiKeyScope[] }
	| { allOf: readonly ApiKeyScope[] };

/** Minimal shape for `@ApiResponse` output DTOs (Z.class / Zod parse). */
export type ResponseDtoClass = Pick<ZodClass, 'parse'>;

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type Arg = { type: 'body' | 'query' } | { type: 'param'; key: string };

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
	accessScope?: AccessScope;
	/** API-key scope(s) required for public API routes (`@ApiKeyScope`). */
	apiKeyScope?: ApiKeyScopeRequirement;
	/**
	 * Output DTO used by PublicApiControllerRegistry to strip undeclared fields
	 * before responding. Provisional until API-39 picks a doc-gen library.
	 */
	responseDto?: ResponseDtoClass;
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
	/**
	 * If true, the controller is mounted by PublicApiControllerRegistry at `/api/v1`
	 * instead of by ControllerRegistry under `/rest`.
	 */
	isPublicApi?: boolean;
	middlewares: HandlerName[];
	routes: Map<HandlerName, RouteMetadata>;
}

export type Controller = Constructable<object> &
	Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;
