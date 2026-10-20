import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import {
	BINARY_RESPONSE_MEDIA_TYPES,
	type BinaryResponse,
	type Controller,
	type ResponseDtoClass,
	type SuccessStatus,
} from './types';

function hasMediaType(body: unknown): body is { mediaType: unknown } {
	return typeof body === 'object' && body !== null && 'mediaType' in body;
}

function isBinaryResponse(body: unknown): body is BinaryResponse {
	return (
		hasMediaType(body) &&
		BINARY_RESPONSE_MEDIA_TYPES.some((mediaType) => mediaType === body.mediaType)
	);
}

function isResponseDto(body: unknown): body is ResponseDtoClass {
	return (
		(typeof body === 'function' || (typeof body === 'object' && body !== null)) && 'parse' in body
	);
}

/**
 * Declares what a route returns on success: its HTTP status, and either its public output DTO or a
 * binary body that the controller method returns.
 *
 * Only one @ApiResponse decorator should be present per endpoint otherwise an error will be thrown.
 */
export function ApiResponse(status: SuccessStatus, dto?: ResponseDtoClass): MethodDecorator;
export function ApiResponse(
	status: Exclude<SuccessStatus, 204>,
	binary: BinaryResponse,
): MethodDecorator;
export function ApiResponse(
	status: SuccessStatus,
	body?: ResponseDtoClass | BinaryResponse,
): MethodDecorator {
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
		if (status === 204 && body !== undefined) {
			const bodyKind = isBinaryResponse(body) ? 'a binary body' : 'a response DTO';
			throw new Error(
				`${String(handlerName)} declares a 204 @ApiResponse with ${bodyKind} - a 204 response must not have a body`,
			);
		}

		routeMetadata.successStatus = status;

		if (isBinaryResponse(body)) {
			routeMetadata.binaryResponse = body;
			return;
		}

		if (hasMediaType(body)) {
			throw new Error(
				`${String(handlerName)} declares an unsupported binary media type "${String(body.mediaType)}" - supported: ${BINARY_RESPONSE_MEDIA_TYPES.join(', ')}`,
			);
		}

		if (body !== undefined && !isResponseDto(body)) {
			throw new Error(
				`${String(handlerName)} declares an @ApiResponse body that is neither a response DTO nor binary options`,
			);
		}

		routeMetadata.responseDto = body;
	};
}
