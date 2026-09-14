import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

/**
 * Gates a Public API route on the instance being within its licensed users quota.
 * `PublicApiControllerRegistry` is the only enforcer of this flag. It is inert on
 * internal `@RestController` routes, which the internal `ControllerRegistry` does
 * not check.
 */
export const RequiresUserQuota = (): MethodDecorator => (target, handlerName) => {
	const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
		target.constructor as Controller,
		String(handlerName),
	);
	routeMetadata.requiresUserQuota = true;
};
