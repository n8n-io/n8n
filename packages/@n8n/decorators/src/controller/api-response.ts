import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { ApiResponseOptions, Controller, ResponseDtoClass, SuccessStatus } from './types';

/** A `ResponseDtoClass` has a `parse` function; a plain `ApiResponseOptions` object does not. */
function isResponseDto(value: ResponseDtoClass | ApiResponseOptions): value is ResponseDtoClass {
	return 'parse' in value;
}

/**
 * Declares what a route returns on success: its HTTP status, and its public output DTO if it sends a
 * body. Only one @ApiResponse decorator should be present per endpoint otherwise an error will be thrown.
 *
 * `options` documents a response that isn't a plain JSON DTO body: a custom description, response
 * headers, or a binary body the handler writes to `res` itself (`binaryMediaType`).
 */
export function ApiResponse(status: SuccessStatus, dto?: ResponseDtoClass): MethodDecorator;
export function ApiResponse(
	status: SuccessStatus,
	dto: ResponseDtoClass,
	options: ApiResponseOptions,
): MethodDecorator;
export function ApiResponse(status: SuccessStatus, options: ApiResponseOptions): MethodDecorator;
export function ApiResponse(
	status: SuccessStatus,
	dtoOrOptions?: ResponseDtoClass | ApiResponseOptions,
	maybeOptions?: ApiResponseOptions,
): MethodDecorator {
	const dto = dtoOrOptions && isResponseDto(dtoOrOptions) ? dtoOrOptions : undefined;
	const options = dtoOrOptions && !isResponseDto(dtoOrOptions) ? dtoOrOptions : maybeOptions;

	return (target, handlerName) => {
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

		if (options?.binaryMediaType !== undefined) {
			if (dto !== undefined) {
				throw new Error(
					`${String(handlerName)} declares a @ApiResponse with both a response DTO and ` +
						'binaryMediaType - a response body is either a JSON DTO or binary, not both',
				);
			}

			if (status === 204) {
				throw new Error(
					`${String(handlerName)} declares a 204 @ApiResponse with binaryMediaType - a 204 ` +
						'response must not have a body',
				);
			}

			if (options.binaryMediaType.toLowerCase().startsWith('application/json')) {
				throw new Error(
					`${String(handlerName)} declares @ApiResponse binaryMediaType '${options.binaryMediaType}' ` +
						'- use a response DTO for a JSON body instead',
				);
			}
		}

		routeMetadata.successStatus = status;
		routeMetadata.responseDto = dto;
		if (options !== undefined) {
			routeMetadata.successResponse = options;
		}
	};
}
