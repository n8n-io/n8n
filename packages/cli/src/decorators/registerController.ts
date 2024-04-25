import { Container } from 'typedi';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import type { Scope } from '@n8n/permissions';
import { ApplicationError } from 'n8n-workflow';
import type { Class } from 'n8n-core';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { inE2ETests, inTest } from '@/constants';
import type { BooleanLicenseFeature } from '@/Interfaces';
import { License } from '@/License';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import {
	CONTROLLER_BASE_PATH,
	CONTROLLER_LICENSE_FEATURES,
	CONTROLLER_MIDDLEWARES,
	CONTROLLER_REQUIRED_SCOPES,
	CONTROLLER_ROUTES,
} from './constants';
import type {
	Controller,
	LicenseMetadata,
	MiddlewareMetadata,
	RouteMetadata,
	ScopeMetadata,
} from './types';

const throttle = expressRateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	limit: 5, // Limit each IP to 5 requests per `window` (here, per 5 minutes).
	message: { message: 'Too many requests' },
});

export const createLicenseMiddleware =
	(features: BooleanLicenseFeature[]): RequestHandler =>
	(_req, res, next) => {
		if (features.length === 0) {
			return next();
		}

		const licenseService = Container.get(License);

		const hasAllFeatures = features.every((feature) => licenseService.isFeatureEnabled(feature));
		if (!hasAllFeatures) {
			return res
				.status(403)
				.json({ status: 'error', message: 'Plan lacks license for this feature' });
		}

		return next();
	};

export const createGlobalScopeMiddleware =
	(scopes: Scope[]): RequestHandler =>
	async ({ user }: AuthenticatedRequest, res, next) => {
		if (scopes.length === 0) {
			return next();
		}

		if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

		const hasScopes = user.hasGlobalScope(scopes);
		if (!hasScopes) {
			return res.status(403).json({ status: 'error', message: 'Unauthorized' });
		}

		return next();
	};

export const registerController = (app: Application, controllerClass: Class<object>) => {
	const controller = Container.get(controllerClass as Class<Controller>);
	const controllerBasePath = Reflect.getMetadata(CONTROLLER_BASE_PATH, controllerClass) as
		| string
		| undefined;
	if (!controllerBasePath)
		throw new ApplicationError('Controller is missing the RestController decorator', {
			extra: { controllerName: controllerClass.name },
		});

	const routes = Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) as RouteMetadata[];
	const licenseFeatures = Reflect.getMetadata(CONTROLLER_LICENSE_FEATURES, controllerClass) as
		| LicenseMetadata
		| undefined;
	const requiredScopes = Reflect.getMetadata(CONTROLLER_REQUIRED_SCOPES, controllerClass) as
		| ScopeMetadata
		| undefined;

	if (routes.length > 0) {
		const router = Router({ mergeParams: true });
		const restBasePath = config.getEnv('endpoints.rest');
		const prefix = `/${[restBasePath, controllerBasePath].join('/')}`
			.replace(/\/+/g, '/')
			.replace(/\/$/, '');

		const controllerMiddlewares = (
			(Reflect.getMetadata(CONTROLLER_MIDDLEWARES, controllerClass) ?? []) as MiddlewareMetadata[]
		).map(({ handlerName }) => controller[handlerName].bind(controller) as RequestHandler);

		const authService = Container.get(AuthService);

		routes.forEach(
			({
				method,
				path,
				middlewares: routeMiddlewares,
				handlerName,
				usesTemplates,
				skipAuth,
				rateLimit,
			}) => {
				const features = licenseFeatures?.[handlerName] ?? licenseFeatures?.['*'];
				const scopes = requiredScopes?.[handlerName] ?? requiredScopes?.['*'];
				const handler = async (req: Request, res: Response) =>
					await controller[handlerName](req, res);
				router[method](
					path,
					...(!inTest && !inE2ETests && rateLimit ? [throttle] : []),
					// eslint-disable-next-line @typescript-eslint/unbound-method
					...(skipAuth ? [] : [authService.authMiddleware]),
					...(features ? [createLicenseMiddleware(features)] : []),
					...(scopes ? [createGlobalScopeMiddleware(scopes)] : []),
					...controllerMiddlewares,
					...routeMiddlewares,
					usesTemplates ? handler : send(handler),
				);
			},
		);

		app.use(prefix, router);
	}
};
