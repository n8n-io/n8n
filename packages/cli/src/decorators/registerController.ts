import { Container } from 'typedi';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { In } from '@n8n/typeorm';
import { ApplicationError } from 'n8n-workflow';
import type { Class } from 'n8n-core';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { RoleService } from '@/services/role.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { ProjectRepository } from '@db/repositories/project.repository';
import type { BooleanLicenseFeature } from '@/Interfaces';
import { License } from '@/License';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import {
	CONTROLLER_BASE_PATH,
	CONTROLLER_LICENSE_FEATURES,
	CONTROLLER_MIDDLEWARES,
	CONTROLLER_ROUTE_SCOPES,
	CONTROLLER_ROUTES,
} from './constants';
import type {
	Controller,
	LicenseMetadata,
	MiddlewareMetadata,
	RouteMetadata,
	RouteScopeMetadata,
} from './types';

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
	async (
		req: AuthenticatedRequest<{ credentialId?: string; workflowId?: string; projectId?: string }>,
		res,
		next,
	) => {
		if (!req.user) throw new UnauthenticatedError();

		const { scopes, globalOnly } = routeScopeMetadata;

		if (scopes.length === 0) return next();

		// Short circuit here since a global role will always
		if (req.user.hasGlobalScope(scopes)) {
			return next();
		}

		if (globalOnly) {
			// The above check already failed so return an auth error
			return res.status(403).json({
				status: 'error',
				message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
			});
		}

		const { credentialId, workflowId, projectId } = req.params;

		const roleService = Container.get(RoleService);
		const projectRoles = roleService.rolesWithScope('project', scopes);
		const userProjectIds = (
			await Container.get(ProjectRepository).find({
				where: {
					projectRelations: {
						userId: req.user.id,
						role: In(projectRoles),
					},
				},
				select: ['id'],
			})
		).map((p) => p.id);

		if (credentialId) {
			const exists = await Container.get(SharedCredentialsRepository).find({
				where: {
					projectId: In(userProjectIds),
					credentialsId: credentialId,
					role: In(roleService.rolesWithScope('credential', scopes)),
				},
			});

			if (!exists.length) {
				return res.status(403).json({
					status: 'error',
					message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
			}

			return next();
		}

		if (workflowId) {
			const exists = await Container.get(SharedWorkflowRepository).find({
				where: {
					projectId: In(userProjectIds),
					workflowId,
					role: In(roleService.rolesWithScope('workflow', scopes)),
				},
			});

			if (!exists.length) {
				return res.status(403).json({
					status: 'error',
					message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
			}

			return next();
		}

		if (projectId) {
			if (!userProjectIds.includes(projectId)) {
				return res.status(403).json({
					status: 'error',
					message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
			}

			return next();
		}

		throw new ApplicationError(
			"@ProjectScope decorator was used but does not have a credentialId, workflowId, or projectId in it's URL parameters. This is likely an implementation error. If you're a developer, please check you're URL is correct or that this should be using @GlobalScope.",
		);
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

		const authService = Container.get(AuthService);

		routes.forEach(
			({ method, path, middlewares: routeMiddlewares, handlerName, usesTemplates, skipAuth }) => {
				const features = licenseFeatures?.[handlerName] ?? licenseFeatures?.['*'];
				const scopes = routeScopes?.[handlerName] ?? routeScopes?.['*'];
				const handler = async (req: Request, res: Response) =>
					await controller[handlerName](req, res);
				router[method](
					path,
					// eslint-disable-next-line @typescript-eslint/unbound-method
					...(skipAuth ? [] : [authService.authMiddleware]),
					...(features ? [createLicenseMiddleware(features)] : []),
					...(scopes ? [createScopedMiddleware(scopes)] : []),
					...controllerMiddlewares,
					...routeMiddlewares,
					usesTemplates ? handler : send(handler),
				);
			},
		);

		app.use(prefix, router);
	}
};
