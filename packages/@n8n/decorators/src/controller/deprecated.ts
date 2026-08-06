import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, DeprecationInfo } from './types';

/**
 * Marks a route deprecated. Stored as route metadata (not a middleware) so it can be read
 * independently by the OpenAPI generator and by the controller registry — a middleware pushed
 * here would be silently discarded, since `@Get`/`@Post`/etc. unconditionally overwrite
 * `routeMetadata.middlewares`.
 */
export const Deprecated =
	(info: DeprecationInfo): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.deprecated = info;
	};
