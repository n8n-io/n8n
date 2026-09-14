import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, ResponseDtoClass, SuccessStatus } from './types';

/**
 * Declares what a route returns on success: its HTTP status, and its public output DTO if it sends a
 * body. Only one @ApiResponse decorator should be present per endpoint otherwise an error will be thrown.
 */
export const ApiResponse =
	(status: SuccessStatus, dto?: ResponseDtoClass): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);

		// A route has exactly one success response
		if (routeMetadata.successStatus !== undefined) {
			throw new Error(
				`${String(handlerName)} declares more than one @ApiResponse - a route has exactly one success response`,
			);
		}

		// HTTP 204 No Content responses must not have a body
		if (status === 204 && dto !== undefined) {
			throw new Error(
				`${String(handlerName)} declares a 204 @ApiResponse with a response DTO - a 204 response must not have a body`,
			);
		}

		routeMetadata.successStatus = status;
		routeMetadata.responseDto = dto;
	};
