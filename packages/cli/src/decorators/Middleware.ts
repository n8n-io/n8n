import { getControllerMetadata } from './controller.registry';
import type { Controller } from './types';

export const Middleware = (): MethodDecorator => (target, handlerName) => {
	const metadata = getControllerMetadata(target.constructor as Controller);
	metadata.middlewares.push(String(handlerName));
};
