import type { Request, Response } from 'express';

export type Method = 'get' | 'post' | 'patch' | 'delete';

export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: string;
}

type RequestHandler = (req?: Request, res?: Response) => Promise<unknown>;
export type Controller = Record<RouteMetadata['handlerName'], RequestHandler>;
