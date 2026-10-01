import { Container } from '@n8n/di';
import type { ZodTypeAny } from 'zod';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Arg, Controller, RequestBodyMedia } from './types';

const ArgDecorator =
	(arg: Arg): ParameterDecorator =>
	(target, handlerName, parameterIndex) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.args[parameterIndex] = arg;
	};

export type BodyOptions = { required?: boolean } & (RequestBodyMedia | { mediaType?: undefined });

/** Narrows `options` to the branch carrying a declared media type, so `toRequestBodyMedia` never casts. */
function hasMediaType(
	options: BodyOptions | undefined,
): options is RequestBodyMedia & { required?: boolean } {
	return options?.mediaType !== undefined;
}

/** Public API only: every media type's own options, switched exhaustively - the compiler enforces
 * a new branch here whenever `RequestBodyMediaOptions` grows a key. */
function toRequestBodyMedia(options: RequestBodyMedia): RequestBodyMedia {
	switch (options.mediaType) {
		case 'application/json':
			return { mediaType: 'application/json' };
		case 'multipart/form-data':
			return { mediaType: 'multipart/form-data', uploadLimits: options.uploadLimits };
	}
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

	// Factory form e.g. `@Body() body: MyDto`, `@Body({ required: true }) body: MyDto`, or
	// `@Body({ mediaType: 'multipart/form-data', uploadLimits }) body: MyDto` (public API only)
	const options = targetOrOptions as BodyOptions | undefined;
	const arg: Arg = { type: 'body' };

	if (options?.required !== undefined) arg.required = options.required;
	if (hasMediaType(options)) arg.media = toRequestBodyMedia(options);

	return ArgDecorator(arg);
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
