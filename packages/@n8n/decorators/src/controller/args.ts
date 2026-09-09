import { Container } from '@n8n/di';
import type { ZodTypeAny } from 'zod';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Arg, Controller } from './types';

const ArgDecorator =
	(arg: Arg): ParameterDecorator =>
	(target, handlerName, parameterIndex) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.args[parameterIndex] = arg;
	};

export interface BodyOptions {
	/**
	 * Public API only. Rejects a request with no body/JSON content-type even when every field on
	 * the DTO is optional (which otherwise makes the body itself optional too). Mirrors the
	 * independent `requestBody.required` an OpenAPI spec can declare regardless of its schema's
	 * own property-level `required`.
	 */
	required?: boolean;
}

/**
 * Injects the request body into the handler. Supports both a bare `@Body payload: SomeDto` and a
 * factory form `@Body({ required: true }) payload: SomeDto` for cases where the DTO alone can't
 * express the right default (see `BodyOptions`). The two are told apart by arity: the runtime
 * always calls a parameter decorator with `(target, propertyKey, parameterIndex)` - 3 arguments -
 * so a call missing `parameterIndex` is the factory being invoked by user code instead.
 */
export function Body(
	target: object,
	propertyKey: string | symbol | undefined,
	parameterIndex: number,
): void;
export function Body(options?: BodyOptions): ParameterDecorator;
export function Body(
	targetOrOptions?: object | BodyOptions,
	propertyKey?: string | symbol,
	parameterIndex?: number,
) {
	if (parameterIndex !== undefined) {
		return ArgDecorator({ type: 'body' })(
			targetOrOptions as object,
			propertyKey as string | symbol,
			parameterIndex,
		);
	}

	const options = targetOrOptions as BodyOptions | undefined;
	return ArgDecorator({
		type: 'body',
		...(options?.required !== undefined && { required: options.required }),
	});
}

/** Injects the request query into the handler */
export const Query = ArgDecorator({ type: 'query' });

/**
 * Injects a request parameter into the handler.
 *
 * `schema` only takes effect on public API routes; internal routes ignore it.
 */
export const Param = (key: string, schema?: ZodTypeAny) =>
	ArgDecorator({ type: 'param', key, ...(schema && { schema }) });
