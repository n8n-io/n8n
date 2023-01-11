import { CONTROLLER_ROUTES } from './constants';
import type { Method, RouteMetadata } from './types';

/* eslint-disable @typescript-eslint/naming-convention */
const RouteFactory =
	(method: Method) =>
	(path: `/${string}`): MethodDecorator =>
	(target, handlerName) => {
		const controllerClass = target.constructor;
		const routes = (Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) ??
			[]) as RouteMetadata[];
		routes.push({ method, path, handlerName: String(handlerName) });
		Reflect.defineMetadata(CONTROLLER_ROUTES, routes, controllerClass);
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');
