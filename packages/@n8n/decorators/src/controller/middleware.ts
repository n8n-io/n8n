import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from './controller-registry-metadata';
import type { Controller } from './types';

export interface MiddlewareOptions {
	/**
	 * Run the middleware before authentication and the scope check, so that it
	 * answers every caller the same. For example, a gate that hides routes with
	 * 404. The middleware cannot read `req.user`.
	 */
	beforeAuth?: boolean;
}

export const Middleware =
	({ beforeAuth = false }: MiddlewareOptions = {}): MethodDecorator =>
	(target, handlerName) => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			target.constructor as Controller,
		);
		const middlewares = beforeAuth ? metadata.preAuthMiddlewares : metadata.middlewares;
		middlewares.push(String(handlerName));
	};
