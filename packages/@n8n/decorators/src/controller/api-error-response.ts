import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Declares an additional non-2xx status code a route can return, beyond the ones already inferred
 * from other decorators (401 always, 403 from `@ApiKeyScope`, 400 from a `@Body`/`@Query` DTO).
 * Stack multiple `@ApiErrorResponse` calls to declare more than one.
 *
 * @example
 * ```ts
 * @Get('/:id')
 * @ApiErrorResponse(404)
 * async getWidget() { ... }
 * ```
 */
export const ApiErrorResponse =
	(status: number): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.errorResponses = [...(routeMetadata.errorResponses ?? []), status];
	};
