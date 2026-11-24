import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, RateLimitAccessName } from './types';

/**
 * Sets whether the Public API rate limiter treats this route as a read or a write. Use it when
 * the HTTP method does not match what the route does, for example a `POST` that only reads.
 * Without it, `GET` and `HEAD` are reads and all other methods are writes.
 */
export const RateLimitAccess =
	(access: RateLimitAccessName): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.rateLimitAccess = access;
	};
