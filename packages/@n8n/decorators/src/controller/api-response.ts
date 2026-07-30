import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, ResponseDtoClass, SuccessStatus } from './types';

/**
 * Declares what a route returns on success: its HTTP status, and its public output DTO if it sends a
 * body.
 */
export function ApiResponse(
	status: Exclude<SuccessStatus, 204>,
	dto: ResponseDtoClass,
): MethodDecorator;
export function ApiResponse(status: SuccessStatus): MethodDecorator;
export function ApiResponse(status: SuccessStatus, dto?: ResponseDtoClass): MethodDecorator {
	return (target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);

		routeMetadata.successStatus = status;
		if (dto !== undefined) routeMetadata.responseDto = dto;
	};
}
