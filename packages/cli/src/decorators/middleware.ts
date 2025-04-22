import { Container } from '@n8n/di';

import { MetadataState } from './metadata-state';
import type { Controller } from './types';

export const Middleware = (): MethodDecorator => (target, handlerName) => {
	const metadata = Container.get(MetadataState).getControllerMetadata(
		target.constructor as Controller,
	);
	metadata.middlewares.push(String(handlerName));
};
