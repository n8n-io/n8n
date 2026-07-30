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

		// Both fields are assigned unconditionally: a route declares one `@ApiResponse`, so if two are
		// stacked the lower (evaluated-first) one must not leave a DTO behind for a bare
		// `@ApiResponse(204)` to inherit - that pairs a no-body status with a documented body.
		routeMetadata.successStatus = status;
		routeMetadata.responseDto = dto;
	};
}
