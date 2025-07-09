import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

export const Middleware = (): MethodDecorator => (target, handlerName) => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		target.constructor as Controller,
	);
	metadata.middlewares.push(String(handlerName));
};
