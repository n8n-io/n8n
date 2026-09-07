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

/** Injects the request body into the handler */
export const Body = ArgDecorator({ type: 'body' });

/** Injects the request query into the handler */
export const Query = ArgDecorator({ type: 'query' });

/**
 * Injects a request parameter into the handler. An optional Zod schema validates the value before
 * the handler runs and reaches the generated OpenAPI spec, the channel `@Query` and `@Body` get
 * from their DTO.
 */
export const Param = (key: string, schema?: ZodTypeAny) =>
	ArgDecorator({ type: 'param', key, ...(schema && { schema }) });
