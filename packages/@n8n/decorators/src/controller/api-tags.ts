import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Declares the OpenAPI tags for a route explicitly, instead of guessing one from the URL path -
 * a route's resource segment doesn't reliably match the project's established tag names (e.g.
 * `/workflows` groups under the singular `Workflow`, not `Workflows`).
 */
export const ApiTags =
	(tags: string[]): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.tags = tags;
	};
