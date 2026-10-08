import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { BinaryResponse, Controller, ResponseDtoClass, SuccessStatus } from './types';

/**
 * Declares what a route returns on success: its HTTP status, and either its public output DTO or a
 * binary body that the controller method writes to `res` itself.
 *
 * For a binary body, the registry sets the declared status and `Content-Type` before it calls the
 * method, and ignores the method's return value. The method must start the response before it
 * resolves (for a stream, await its `finish`). A method that returns without a response fails with
 * a 500.
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
		} else {
			routeMetadata.responseDto = body;
		}
	};
}

function isBinaryResponse(body: unknown): body is BinaryResponse {
	return typeof body === 'object' && body !== null && 'mediaType' in body;
}
