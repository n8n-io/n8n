import type { Request, Response } from 'express';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface MiddlewareMetadata {
	handlerName: string;
}

export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: string;
}

type RequestHandler = (req?: Request, res?: Response) => Promise<unknown>;
export type Controller = Record<RouteMetadata['handlerName'], RequestHandler>;
