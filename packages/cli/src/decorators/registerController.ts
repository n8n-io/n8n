import { Container } from 'typedi';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import type { Class } from 'n8n-core';

import config from '@/config';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import {
	CONTROLLER_AUTH_ROLES,
	CONTROLLER_BASE_PATH,
	CONTROLLER_LICENSE_FEATURES,
	CONTROLLER_MIDDLEWARES,
	CONTROLLER_ROUTE_SCOPES,
	CONTROLLER_ROUTES,
} from './constants';
import type {
	AuthRole,
	AuthRoleMetadata,
	Controller,
	LicenseMetadata,
	MiddlewareMetadata,
	RouteMetadata,
	RouteScopeMetadata,
} from './types';
import type { BooleanLicenseFeature } from '@/Interfaces';

import { License } from '@/License';
import { ApplicationError } from 'n8n-workflow';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';

export const createAuthMiddleware =
	(authRole: AuthRole): RequestHandler =>
	({ user }: AuthenticatedRequest, res, next) => {
		if (authRole === 'none') return next();

		if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

		if (authRole === 'any' || authRole === user.role) return next();

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

export const createScopedMiddleware =
	(routeScopeMetadata: RouteScopeMetadata[string]): RequestHandler =>
	async (req: AuthenticatedRequest<{ projectId?: string }>, res, next) => {
		if (!req.user) throw new UnauthenticatedError();

		const { scopes, globalOnly } = routeScopeMetadata;

		if (scopes.length === 0) return next();

		if (globalOnly) {
			if (!req.user.hasGlobalScope(scopes)) {
				return res.status(403).json({
					status: 'error',
					message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
			}

			return next();
		}

		/**
		 * @TODO: Refactor this to get rid of project ID route parameter. Instead:
		 *
		 * 1. Fetch all the **projects** that the resource has been shared with,
		 * and the **roles** of those sharings.
		 *
		 * 2. Check if those fetched roles contain the scope that allows the action.
		 *
		 * 3. Find the user's roles in them in all those fetched projects.
		 *
		 * 4. Check if any of those roles contains the scope that allows the action.
		 */

		const { projectId } = req.params;

		if (!projectId) {
			return res.status(400).json({
				status: 'error',
				message: 'Missing `projectId` route parameter',
			});
		}

		const projectRole = await Container.get(ProjectRelationRepository).findProjectRole({
			userId: req.user.id,
			projectId,
		});

		if (!projectRole) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found in project',
			});
		}

		if (!req.user.hasScope(scopes, projectRole)) {
			return res.status(403).json({
				status: 'error',
				message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
			});
		}

		return next();
	};

const authFreeRoutes: string[] = [];

export const canSkipAuth = (method: string, path: string): boolean =>
	authFreeRoutes.includes(`${method.toLowerCase()} ${path}`);

export const registerController = (app: Application, controllerClass: Class<object>) => {
	const controller = Container.get(controllerClass as Class<Controller>);
	const controllerBasePath = Reflect.getMetadata(CONTROLLER_BASE_PATH, controllerClass) as
		| string
		| undefined;
	if (!controllerBasePath)
		throw new ApplicationError('Controller is missing the RestController decorator', {
			extra: { controllerName: controllerClass.name },
		});

	const authRoles = Reflect.getMetadata(CONTROLLER_AUTH_ROLES, controllerClass) as
		| AuthRoleMetadata
		| undefined;
	const routes = Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) as RouteMetadata[];
	const licenseFeatures = Reflect.getMetadata(CONTROLLER_LICENSE_FEATURES, controllerClass) as
		| LicenseMetadata
		| undefined;
	const routeScopes = Reflect.getMetadata(CONTROLLER_ROUTE_SCOPES, controllerClass) as
		| RouteScopeMetadata
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
				const scopes = routeScopes?.[handlerName] ?? routeScopes?.['*'];
				const handler = async (req: Request, res: Response) =>
					await controller[handlerName](req, res);
				router[method](
					path,
					...(authRole ? [createAuthMiddleware(authRole)] : []),
					...(features ? [createLicenseMiddleware(features)] : []),
					...(scopes ? [createScopedMiddleware(scopes)] : []),
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
