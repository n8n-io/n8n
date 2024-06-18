import { Container, Service } from 'typedi';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { inProduction, RESPONSE_ERROR_MESSAGES } from '@/constants';
import type { BooleanLicenseFeature } from '@/Interfaces';
import { License } from '@/License';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import { userHasScope } from '@/permissions/checkAccess';

import type {
	AccessScope,
	Controller,
	ControllerMetadata,
	HandlerName,
	RateLimit,
	RouteMetadata,
} from './types';

const registry = new Map<Controller, ControllerMetadata>();

export const getControllerMetadata = (controllerClass: Controller) => {
	let metadata = registry.get(controllerClass);
	if (!metadata) {
		metadata = {
			basePath: '/',
			middlewares: [],
			routes: new Map(),
		};
		registry.set(controllerClass, metadata);
	}
	return metadata;
};

export const getRouteMetadata = (controllerClass: Controller, handlerName: HandlerName) => {
	const metadata = getControllerMetadata(controllerClass);
	let route = metadata.routes.get(handlerName);
	if (!route) {
		route = {} as RouteMetadata;
		metadata.routes.set(handlerName, route);
	}
	return route;
};

@Service()
export class ControllerRegistry {
	constructor(
		private readonly license: License,
		private readonly authService: AuthService,
	) {}

	activate(app: Application) {
		for (const controllerClass of registry.keys()) {
			this.activateController(app, controllerClass);
		}
	}

	private activateController(app: Application, controllerClass: Controller) {
		const metadata = registry.get(controllerClass)!;

		const router = Router({ mergeParams: true });
		const prefix = `/${config.getEnv('endpoints.rest')}/${metadata.basePath}`
			.replace(/\/+/g, '/')
			.replace(/\/$/, '');
		app.use(prefix, router);

		const controller = Container.get<Controller>(controllerClass);
		const controllerMiddlewares = metadata.middlewares.map(
			(handlerName) => controller[handlerName].bind(controller) as RequestHandler,
		);

		for (const [handlerName, route] of metadata.routes) {
			const handler = async (req: Request, res: Response) =>
				await controller[handlerName](req, res);

			router[route.method](
				route.path,
				...(inProduction && route.rateLimit
					? [this.createRateLimitMiddleware(route.rateLimit)]
					: []),
				// eslint-disable-next-line @typescript-eslint/unbound-method
				...(route.skipAuth ? [] : [this.authService.authMiddleware]),
				...(route.licenseFeature ? [this.createLicenseMiddleware(route.licenseFeature)] : []),
				...(route.accessScope ? [this.createScopedMiddleware(route.accessScope)] : []),
				...controllerMiddlewares,
				...route.middlewares,
				route.usesTemplates ? handler : send(handler),
			);
		}
	}

	private createRateLimitMiddleware(rateLimit: true | RateLimit): RequestHandler {
		if (typeof rateLimit === 'boolean') rateLimit = {};
		return expressRateLimit({
			windowMs: rateLimit.windowMs,
			limit: rateLimit.limit,
			message: { message: 'Too many requests' },
		});
	}

	private createLicenseMiddleware(feature: BooleanLicenseFeature): RequestHandler {
		return (_req, res, next) => {
			if (!this.license.isFeatureEnabled(feature)) {
				return res
					.status(403)
					.json({ status: 'error', message: 'Plan lacks license for this feature' });
			}
			return next();
		};
	}

	private createScopedMiddleware(accessScope: AccessScope): RequestHandler {
		return async (
			req: AuthenticatedRequest<{ credentialId?: string; workflowId?: string; projectId?: string }>,
			res,
			next,
		) => {
			if (!req.user) throw new UnauthenticatedError();

			const { scope, globalOnly } = accessScope;

			if (!(await userHasScope(req.user, [scope], globalOnly, req.params))) {
				return res.status(403).json({
					status: 'error',
					message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
			}

			return next();
		};
	}
}
