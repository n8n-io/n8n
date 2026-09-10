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
	required?: boolean;
}

/** Injects the request body into the handler */
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
): ParameterDecorator | void {
	// Bare form e.g. `@Body body: MyDto`
	if (parameterIndex !== undefined) {
		return ArgDecorator({ type: 'body' })(targetOrOptions as object, propertyKey, parameterIndex);
	}

	// Factory form e.g. `@Body() body: MyDto` or `@Body({ required: true }) body: MyDto`
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
