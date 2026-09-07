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
 * Injects a request parameter into the handler.
 *
 * `schema` applies to public API routes only: `PublicApiControllerRegistry` parses the segment
 * against it and returns a 400 on failure, and the generator publishes it in the OpenAPI spec.
 * This is the channel `@Query` and `@Body` get from their DTO. `ControllerRegistry` ignores it
 * and injects the raw segment, so a schema on an internal route validates nothing.
 */
export const Param = (key: string, schema?: ZodTypeAny) =>
	ArgDecorator({ type: 'param', key, ...(schema && { schema }) });
