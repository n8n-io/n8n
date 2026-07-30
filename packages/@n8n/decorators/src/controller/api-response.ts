import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, ResponseDtoClass } from './types';

/**
 * Declares the public output DTO for a route.
 *
 * PublicApiControllerRegistry `.parse()`s the handler return value through this
 * schema before sending, stripping undeclared/internal fields. The same schema
 * will feed OpenAPI response generation once API-39 lands (shape is provisional).
 *
 * @example
 * ```ts
 * @Get('/')
 * @ApiResponse(TagListPublicDto)
 * async getTags() { ... }
 * ```
 */
export const ApiResponse =
	(dto: ResponseDtoClass): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.responseDto = dto;
	};
