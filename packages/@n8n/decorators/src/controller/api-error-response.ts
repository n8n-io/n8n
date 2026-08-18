import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, ResponseDtoClass } from './types';

/**
 * Declares a non-2xx status code a route can return, beyond the ones already inferred
 * from other decorators. Stack multiple `@ApiErrorResponse` calls to declare more than one.
 */
export const ApiErrorResponse =
	(status: number, dto?: ResponseDtoClass, description?: string): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.errorResponses = [
			...(routeMetadata.errorResponses ?? []),
			{ status, ...(dto ? { dto } : {}), ...(description ? { description } : {}) },
		].sort((a, b) => a.status - b.status);
	};
