import { CONTROLLER_ROUTES } from './constants';
import type { MiddlewareFunction, RouteMetadata } from './types';

/* eslint-disable @typescript-eslint/naming-convention */
export const Middleware =
	(middleware: MiddlewareFunction | MiddlewareFunction[]): MethodDecorator =>
	(target, handlerName) => {
		const controllerClass = target.constructor;
		const routes = (Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) ??
			[]) as RouteMetadata[];
		if (middleware) {
			if (!Array.isArray(middleware)) middleware = [middleware];
		}
		const matchingRouteIndex = routes.findIndex((e) => e.handlerName === String(handlerName));
		if (matchingRouteIndex > -1) {
			routes[matchingRouteIndex].middlewares = middleware;
		} else {
			routes.push({
				handlerName: String(handlerName),
				middlewares: middleware,
			});
		}
		Reflect.defineMetadata(CONTROLLER_ROUTES, routes, controllerClass);
	};
