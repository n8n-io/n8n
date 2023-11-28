import type { Request, Response, RequestHandler } from 'express';
import type { RoleNames, RoleScopes } from '@db/entities/Role';
import type { BooleanLicenseFeature } from '@/Interfaces';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type AuthRole = [RoleScopes, RoleNames] | 'any' | 'none';
export type AuthRoleMetadata = Record<string, AuthRole>;

export type LicenseMetadata = Record<string, BooleanLicenseFeature[]>;

export interface MiddlewareMetadata {
	handlerName: string;
}

export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: string;
	middlewares: RequestHandler[];
	usesTemplates: boolean;
}

export type Controller = Record<
	RouteMetadata['handlerName'],
	(req?: Request, res?: Response) => Promise<unknown>
>;
