import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, RateLimitTierName } from './types';

/**
 * Overrides the Public API rate-limit tier of a route. Without it, `GET` and `HEAD` are reads and
 * all other methods are writes.
 */
export const RateLimitTier =
	(tier: RateLimitTierName): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.rateLimitTier = tier;
	};
