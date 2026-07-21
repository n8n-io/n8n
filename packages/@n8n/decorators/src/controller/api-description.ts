import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Declares the public-facing OpenAPI description for a route.
 *
 * Feeds the generated OpenAPI operation's `description` field (see
 * `resolvePublicApiRoutes` in `packages/cli/src/public-api/public-api-route-resolver.ts`)
 * — there's no DTO to hang this off, since it describes what the endpoint
 * does, not the shape of any request/response.
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
