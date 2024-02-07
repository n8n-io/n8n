import type { RequestHandler } from 'express';
import { CONTROLLER_ROUTES } from './constants';
import type { Method, RouteMetadata } from './types';

interface RouteOptions {
	middlewares?: RequestHandler[];
	usesTemplates?: boolean;
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
		});
		Reflect.defineMetadata(CONTROLLER_ROUTES, routes, controllerClass);
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Put = RouteFactory('put');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');
