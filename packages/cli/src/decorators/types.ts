import type { NextFunction, Request, Response } from 'express';

export type Method = 'get' | 'post' | 'patch' | 'delete';

export type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void;

export interface RouteMetadata {
	method?: Method;
	path?: string;
	handlerName: string;
	middlewares?: MiddlewareFunction[];
}

type RequestHandler = (req?: Request, res?: Response) => Promise<unknown>;
export type Controller = Record<RouteMetadata['handlerName'], RequestHandler>;
