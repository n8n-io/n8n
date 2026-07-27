import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Declares the public-facing OpenAPI description for a route.
 *
 * @example
 * ```ts
 * @Get('/')
 * @ApiDescription('Retrieve all tags from your instance.')
 * async getTags() { ... }
 * ```
 */
export const ApiDescription =
	(description: string): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.description = description;
	};
