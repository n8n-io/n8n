import { CONTROLLER_MIDDLEWARES } from './constants';
import type { MiddlewareMetadata } from './types';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Middleware = (): MethodDecorator => (target, handlerName) => {
	const controllerClass = target.constructor;
	const middlewares = (Reflect.getMetadata(CONTROLLER_MIDDLEWARES, controllerClass) ??
		[]) as MiddlewareMetadata[];
	middlewares.push({ handlerName: String(handlerName) });
	Reflect.defineMetadata(CONTROLLER_MIDDLEWARES, middlewares, controllerClass);
};
