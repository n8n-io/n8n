import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Declares the OpenAPI tags for a route. These will be ordered alphabetically.
 */
export const ApiTags =
	(tags: string[]): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.tags = [...tags].sort((a, b) => a.localeCompare(b));
	};
