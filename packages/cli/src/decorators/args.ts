import { getRouteMetadata } from './controller.registry';
import type { Arg, Controller } from './types';

const ArgDecorator =
	(arg: Arg): ParameterDecorator =>
	(target, handlerName, parameterIndex) => {
		const routeMetadata = getRouteMetadata(target.constructor as Controller, String(handlerName));
		routeMetadata.args[parameterIndex] = arg;
	};

/** Injects the request body into the handler */
export const Body = ArgDecorator({ type: 'body' });

/** Injects the request query into the handler */
export const Query = ArgDecorator({ type: 'query' });

/** Injects a request parameter into the handler */
export const Param = (key: string) => ArgDecorator({ type: 'param', key });
