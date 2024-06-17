import { getControllerMetadata } from './controller.registry';

export const Middleware = (): MethodDecorator => (target, handlerName) => {
	const metadata = getControllerMetadata(target.constructor);
	metadata.middlewares.push(String(handlerName));
};
