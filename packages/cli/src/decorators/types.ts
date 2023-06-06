import type { Request, Response, RequestHandler } from 'express';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RoleNames = 'owner' | 'member' | 'user' | 'editor';
export type RoleScopes = 'global' | 'workflow' | 'credential';

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
