import type { Request, Response, RequestHandler } from 'express';
import type { BooleanLicenseFeature } from '@/Interfaces';
import type { Scope } from '@n8n/permissions';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type LicenseMetadata = Record<string, BooleanLicenseFeature[]>;

export type RouteScopeMetadata = {
	[handlerName: string]: {
		scopes: Scope[];
		globalOnly: boolean;
	};
};

export interface MiddlewareMetadata {
	handlerName: string;
}

export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: string;
	middlewares: RequestHandler[];
	usesTemplates: boolean;
	skipAuth: boolean;
	rateLimit: boolean;
}

export type Controller = Record<
	RouteMetadata['handlerName'],
	(req?: Request, res?: Response) => Promise<unknown>
>;
