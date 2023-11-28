import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import type { Config } from '@/config';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import {
	CONTROLLER_AUTH_ROLES,
	CONTROLLER_BASE_PATH,
	CONTROLLER_LICENSE_FEATURES,
	CONTROLLER_MIDDLEWARES,
	CONTROLLER_REQUIRED_SCOPES,
	CONTROLLER_ROUTES,
} from './constants';
import type {
	AuthRole,
	AuthRoleMetadata,
	Controller,
	LicenseMetadata,
	MiddlewareMetadata,
	RouteMetadata,
	ScopeMetadata,
} from './types';
import type { BooleanLicenseFeature } from '@/Interfaces';
import Container from 'typedi';
import { License } from '@/License';
import type { Scope } from '@n8n/permissions';

export const createAuthMiddleware =
	(authRole: AuthRole): RequestHandler =>
	({ user }: AuthenticatedRequest, res, next) => {
		if (authRole === 'none') return next();

		if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

		const { globalRole } = user;
		if (authRole === 'any' || (globalRole.scope === authRole[0] && globalRole.name === authRole[1]))
			return next();

		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	};

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

		const hasScopes = await user.hasGlobalScope(scopes);
		if (!hasScopes) {
			return res.status(403).json({ status: 'error', message: 'Unauthorized' });
		}

		return next();
	};

const authFreeRoutes: string[] = [];

export const canSkipAuth = (method: string, path: string): boolean =>
	authFreeRoutes.includes(`${method.toLowerCase()} ${path}`);

export const registerController = (app: Application, config: Config, cObj: object) => {
	const controller = cObj as Controller;
	const controllerClass = controller.constructor;
	const controllerBasePath = Reflect.getMetadata(CONTROLLER_BASE_PATH, controllerClass) as
		| string
		| undefined;
	if (!controllerBasePath)
		throw new Error(`${controllerClass.name} is missing the RestController decorator`);

	const authRoles = Reflect.getMetadata(CONTROLLER_AUTH_ROLES, controllerClass) as
		| AuthRoleMetadata
		| undefined;
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

		routes.forEach(
			({ method, path, middlewares: routeMiddlewares, handlerName, usesTemplates }) => {
				const authRole = authRoles?.[handlerName] ?? authRoles?.['*'];
				const features = licenseFeatures?.[handlerName] ?? licenseFeatures?.['*'];
				const scopes = requiredScopes?.[handlerName] ?? requiredScopes?.['*'];
				const handler = async (req: Request, res: Response) => controller[handlerName](req, res);
				router[method](
					path,
					...(authRole ? [createAuthMiddleware(authRole)] : []),
					...(features ? [createLicenseMiddleware(features)] : []),
					...(scopes ? [createGlobalScopeMiddleware(scopes)] : []),
					...controllerMiddlewares,
					...routeMiddlewares,
					usesTemplates ? handler : send(handler),
				);
				if (!authRole || authRole === 'none') authFreeRoutes.push(`${method} ${prefix}${path}`);
			},
		);

		app.use(prefix, router);
	}
};
