import type { Request, Response, RequestHandler } from 'express';
import type { RoleNames, RoleScopes } from '@db/entities/Role';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type AuthRole = [RoleScopes, RoleNames] | 'any' | 'none';
export type AuthRoleMetadata = Record<string, AuthRole>;

export interface MiddlewareMetadata {
	handlerName: string;
}

export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: string;
	middlewares: RequestHandler[];
}

export type Controller = Record<
	RouteMetadata['handlerName'],
	(req?: Request, res?: Response) => Promise<unknown>
>;
