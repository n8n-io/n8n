import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { ApplicationError } from 'n8n-workflow';
import type { ZodClass } from 'zod-class';

import { AuthService } from '@/auth/auth.service';
import { inProduction, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import type { BooleanLicenseFeature } from '@/interfaces';
import { License } from '@/license';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/response-helper'; // TODO: move `ResponseHelper.send` to this file

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
		route.args = [];
		metadata.routes.set(handlerName, route);
	}
	return route;
};

@Service()
export class ControllerRegistry {
	constructor(
		private readonly license: License,
		private readonly authService: AuthService,
		private readonly globalConfig: GlobalConfig,
	) {}

	activate(app: Application) {
		for (const controllerClass of registry.keys()) {
			this.activateController(app, controllerClass);
		}
	}

	private activateController(app: Application, controllerClass: Controller) {
		const metadata = registry.get(controllerClass)!;

		const router = Router({ mergeParams: true });
		const prefix = `/${this.globalConfig.endpoints.rest}/${metadata.basePath}`
			.replace(/\/+/g, '/')
			.replace(/\/$/, '');
		app.use(prefix, router);

		const controller = Container.get(controllerClass) as Controller;
		const controllerMiddlewares = metadata.middlewares.map(
			(handlerName) => controller[handlerName].bind(controller) as RequestHandler,
		);

		for (const [handlerName, route] of metadata.routes) {
			const argTypes = Reflect.getMetadata(
				'design:paramtypes',
				controller,
				handlerName,
			) as unknown[];
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			const handler = async (req: Request, res: Response) => {
				const args: unknown[] = [req, res];
				for (let index = 0; index < route.args.length; index++) {
					const arg = route.args[index];
					if (!arg) continue; // Skip args without any decorators
					if (arg.type === 'param') args.push(req.params[arg.key]);
					else if (['body', 'query'].includes(arg.type)) {
						const paramType = argTypes[index] as ZodClass;
						if (paramType && 'safeParse' in paramType) {
							const output = paramType.safeParse(req[arg.type]);
							if (output.success) args.push(output.data);
							else {
								return res.status(400).json(output.error.errors[0]);
							}
						}
					} else throw new ApplicationError('Unknown arg type: ' + arg.type);
				}
				return await controller[handlerName](...args);
			};

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

			if (!(await userHasScopes(req.user, [scope], globalOnly, req.params))) {
				return res.status(403).json({
					status: 'error',
					message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
			}

			return next();
		};
	}
}
