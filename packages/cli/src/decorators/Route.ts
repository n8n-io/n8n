import type { RequestHandler } from 'express';
import { CONTROLLER_ROUTES } from './constants';
import type { Method, RouteMetadata } from './types';
import type { Options } from 'express-rate-limit';
import { rateLimit } from 'express-rate-limit';
import { inTest } from '@/constants';

interface RouteOptions {
	middlewares?: RequestHandler[];
	throttle?: Partial<Options>;
}

const RouteFactory =
	(method: Method) =>
	(path: `/${string}`, options: RouteOptions = {}): MethodDecorator =>
	(target, handlerName) => {
		const controllerClass = target.constructor;
		const routes = (Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) ??
			[]) as RouteMetadata[];
		const middlewares = options.middlewares ?? [];
		if (options.throttle && !inTest) middlewares.unshift(rateLimit(options.throttle));

		routes.push({
			method,
			path,
			middlewares,
			handlerName: String(handlerName),
		});
		Reflect.defineMetadata(CONTROLLER_ROUTES, routes, controllerClass);
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Put = RouteFactory('put');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');
