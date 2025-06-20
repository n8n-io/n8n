import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller, Method, RateLimit } from './types';

interface RouteOptions {
	middlewares?: RequestHandler[];
	usesTemplates?: boolean;
	/** When this flag is set to true, auth cookie isn't validated, and req.user will not be set */
	skipAuth?: boolean;
	/** When this flag is set to true, the auth cookie does not enforce MFA to be used in the token */
	allowSkipMFA?: boolean;
	/** When these options are set, calls to this endpoint are rate limited using the options */
	rateLimit?: boolean | RateLimit;
}

const RouteFactory =
	(method: Method) =>
	(path: `/${string}`, options: RouteOptions = {}): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.method = method;
		routeMetadata.path = path;
		routeMetadata.middlewares = options.middlewares ?? [];
		routeMetadata.usesTemplates = options.usesTemplates ?? false;
		routeMetadata.skipAuth = options.skipAuth ?? false;
		routeMetadata.allowSkipMFA = options.allowSkipMFA ?? false;
		routeMetadata.rateLimit = options.rateLimit;
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Put = RouteFactory('put');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');
