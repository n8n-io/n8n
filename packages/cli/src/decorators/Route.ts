import type { RequestHandler } from 'express';
import { CONTROLLER_ROUTES } from './constants';
import type { Method, RouteMetadata } from './types';

interface RouteOptions {
	middlewares?: RequestHandler[];
	usesTemplates?: boolean;
	/** When this flag is set to true, auth cookie isn't validated, and req.user will not be set */
	skipAuth?: boolean;
	/** When this flag is set to true, calls to this endpoint is rate limited to a max of 5 over a window of 5 minutes **/
	rateLimit?: boolean;
}

const RouteFactory =
	(method: Method) =>
	(path: `/${string}`, options: RouteOptions = {}): MethodDecorator =>
	(target, handlerName) => {
		const controllerClass = target.constructor;
		const routes = (Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) ??
			[]) as RouteMetadata[];
		routes.push({
			method,
			path,
			middlewares: options.middlewares ?? [],
			handlerName: String(handlerName),
			usesTemplates: options.usesTemplates ?? false,
			skipAuth: options.skipAuth ?? false,
			rateLimit: options.rateLimit ?? false,
		});
		Reflect.defineMetadata(CONTROLLER_ROUTES, routes, controllerClass);
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Put = RouteFactory('put');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');
