import type { Constructable } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { RequestHandler } from 'express';

/**
 * @TODO Temporary duplicated type until `LICENSE_FEATURES` is moved out of `cli`
 */
export type BooleanLicenseFeature =
	| 'feat:sharing'
	| 'feat:ldap'
	| 'feat:saml'
	| 'feat:logStreaming'
	| 'feat:advancedExecutionFilters'
	| 'feat:variables'
	| 'feat:sourceControl'
	| 'feat:apiDisabled'
	| 'feat:externalSecrets'
	| 'feat:showNonProdBanner'
	| 'feat:workflowHistory'
	| 'feat:debugInEditor'
	| 'feat:binaryDataS3'
	| 'feat:multipleMainInstances'
	| 'feat:workerView'
	| 'feat:advancedPermissions'
	| 'feat:projectRole:admin'
	| 'feat:projectRole:editor'
	| 'feat:projectRole:viewer'
	| 'feat:aiAssistant'
	| 'feat:askAi'
	| 'feat:communityNodes:customRegistry'
	| 'feat:aiCredits'
	| 'feat:folders'
	| 'feat:insights:viewSummary'
	| 'feat:insights:viewDashboard'
	| 'feat:insights:viewHourlyData'
	| 'feat:apiKeyScopes';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type Arg = { type: 'body' | 'query' } | { type: 'param'; key: string };

export interface RateLimit {
	/**
	 * The maximum number of requests to allow during the `window` before rate limiting the client.
	 * @default 5
	 */
	limit?: number;
	/**
	 * How long we should remember the requests.
	 * @default 300_000 (5 minutes)
	 */
	windowMs?: number;
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
	rateLimit?: boolean | RateLimit;
	licenseFeature?: BooleanLicenseFeature;
	accessScope?: AccessScope;
	args: Arg[];
}

export interface ControllerMetadata {
	basePath: `/${string}`;
	middlewares: HandlerName[];
	routes: Map<HandlerName, RouteMetadata>;
}

export type Controller = Constructable<object> &
	Record<HandlerName, (...args: unknown[]) => Promise<unknown>>;

type HandlerFn = () => Promise<void> | void;

type Class<T = object, A extends unknown[] = unknown[]> = new (...args: A) => T;

export type ServiceClass = Class<Record<string, HandlerFn>>;

export interface ShutdownHandler {
	serviceClass: ServiceClass;
	methodName: string;
}
