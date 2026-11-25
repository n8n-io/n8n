import { Logger } from '@n8n/backend-common';
import { isAuthenticatedRequest, principalFromUser } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type {
	HttpApiV1,
	HttpMethodV1,
	HttpMiddlewareFnV1,
	HttpMiddlewaresV1,
	HttpMiddlewareV1,
	HttpRequestV1,
	HttpRouteV1,
	PrincipalV1,
	SecurityContextV1,
} from '@n8n/hooks-api';
import { type Principal, type Scope, scopeSchema } from '@n8n/permissions';
import type { Request, Router as ExpressRouter, RequestHandler } from 'express';
import { Router } from 'express';

import { ControllerRegistry } from '@/controller.registry';

type QueryV1 = HttpRequestV1['query'];

type RouteFlags = Parameters<ControllerRegistry['buildMiddlewares']>[0];

const isHttpMiddlewareFnV1 = (
	value: HttpMiddlewareFnV1 | HttpMiddlewareV1,
): value is HttpMiddlewareFnV1 => typeof value === 'function';

/** The contract says an unavailable field is absent, so no key holds `undefined`. */
const toPrincipalV1 = ({ id, type, email, firstName, lastName }: Principal): PrincipalV1 => {
	const principal: PrincipalV1 = { id, type };
	if (email !== undefined) principal.email = email;
	if (firstName !== undefined) principal.firstName = firstName;
	if (lastName !== undefined) principal.lastName = lastName;
	return principal;
};

const toSecurityV1 = (req: Request): SecurityContextV1 | undefined => {
	if (!isAuthenticatedRequest(req)) return undefined;
	return { subject: toPrincipalV1(principalFromUser(req.user)), authMethod: 'session-cookie' };
};

const toQueryV1 = (query: Request['query']): QueryV1 => {
	const result: QueryV1 = {};
	for (const [key, value] of Object.entries(query)) {
		if (typeof value === 'string') result[key] = value;
		else if (Array.isArray(value)) result[key] = value.filter((v) => typeof v === 'string');
	}
	return result;
};

const toRequestV1 = (method: HttpMethodV1, req: Request): HttpRequestV1 => ({
	method,
	path: req.path,
	params: toParamsV1(req.params),
	query: toQueryV1(req.query),
	headers: req.headers,
	body: toJsonBodyV1(req),
	security: toSecurityV1(req),
});

/** The contract exposes a parsed JSON body, or `undefined` when the request has none. */
const toJsonBodyV1 = (req: Request): unknown => {
	if (req.contentType !== 'application/json' || !req.rawBody?.length) return undefined;
	return req.body;
};

const toParamsV1 = (params: Request['params']): HttpRequestV1['params'] => {
	const result: HttpRequestV1['params'] = {};
	for (const [key, value] of Object.entries(params)) {
		result[key] = Array.isArray(value) ? value.join('/') : value;
	}
	return result;
};

const isScope = (value: string): value is Scope => scopeSchema.safeParse(value).success;

@Service()
export class PublicHttpService implements HttpApiV1 {
	readonly version = 1;
	readonly middlewares: HttpMiddlewaresV1;

	private readonly provided = new WeakMap<HttpMiddlewareV1, RouteFlags>();

	/**
	 * Mounted after the built-in API routes and before the editor UI fallback,
	 * so routes that extensions add later, during `register`, are still reachable.
	 */
	readonly router: ExpressRouter = Router();

	constructor(
		private readonly logger: Logger,
		private readonly controllerRegistry: ControllerRegistry,
	) {
		this.middlewares = {
			sessionAuthentication: this.provide('sessionAuthentication', { skipAuth: false }),
			requireGlobalScope: (scope) => {
				if (!isScope(scope)) throw new UserError(`Unknown scope "${scope}"`);
				return this.provide(`requireGlobalScope(${scope})`, {
					skipAuth: true,
					accessScope: { scope, globalOnly: true },
				});
			},
		};
	}

	private provide(name: string, flags: RouteFlags): HttpMiddlewareV1 {
		const handle: HttpMiddlewareV1 = Object.freeze({ name });
		this.provided.set(handle, flags);
		return handle;
	}

	private toExpress(method: HttpMethodV1, path: string, fn: HttpMiddlewareFnV1): RequestHandler {
		return async (req, res, next) => {
			try {
				const response = await fn(toRequestV1(method, req));
				if (response === undefined) return next();
				res.status(response.status);
				if (response.headers) res.set(response.headers);
				if (response.body === undefined) res.end();
				else res.json(response.body);
			} catch (error) {
				this.logger.error('Extension route failed', { method, path, error });
				res.status(500).json({ message: 'Internal server error' });
			}
		};
	}

	/** Reached only when the handler returned nothing. */
	private readonly noResponse: RequestHandler = (req, res) => {
		this.logger.error('Extension route returned no response', {
			method: req.method,
			path: req.path,
		});
		res.status(500).json({ message: 'Internal server error' });
	};

	registerRoute({ method, path, middlewares, handler }: HttpRouteV1): void {
		if (!path.startsWith('/')) {
			throw new UserError('Route path must start with "/"', { extra: { path } });
		}

		const chain: RequestHandler[] = [];
		let authenticated = false;

		for (const middleware of middlewares) {
			if (isHttpMiddlewareFnV1(middleware)) {
				chain.push(this.toExpress(method, path, middleware));
				continue;
			}

			const flags = this.provided.get(middleware);
			if (!flags) throw new UserError('Unknown middleware. Use one from api.http.middlewares');
			if (flags.accessScope && !authenticated) {
				throw new UserError('requireGlobalScope needs sessionAuthentication before it');
			}
			if (!flags.skipAuth) authenticated = true;
			chain.push(...this.controllerRegistry.buildMiddlewares(flags, []));
		}

		this.router[method](path, ...chain, this.toExpress(method, path, handler), this.noResponse);
		this.logger.debug('Registered extension route', { method, path });
	}
}
