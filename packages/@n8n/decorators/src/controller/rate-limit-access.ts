import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, RateLimitAccessName } from './types';

/**
 * Counts a Public API route as a read or a write for rate limiting. Without it, `GET` and `HEAD`
 * are reads and all other methods are writes. Every Public API route has a limit; this does not
 * add one.
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
