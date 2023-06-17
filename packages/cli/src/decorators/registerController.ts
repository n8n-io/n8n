/* eslint-disable @typescript-eslint/naming-convention */
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import type { Config } from '@/config';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import {
	CONTROLLER_AUTH_ROLES,
	CONTROLLER_BASE_PATH,
	CONTROLLER_MIDDLEWARES,
	CONTROLLER_ROUTES,
} from './constants';
import type {
	AuthRole,
	AuthRoleMetadata,
	Controller,
	MiddlewareMetadata,
	RouteMetadata,
} from './types';

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

const authFreeRoutes: string[] = [];

export const canSkipAuth = (method: string, path: string): boolean =>
	authFreeRoutes.includes(`${method.toLowerCase()} ${path}`);

export const registerController = (app: Application, config: Config, controller: object) => {
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
	if (routes.length > 0) {
		const router = Router({ mergeParams: true });
		const restBasePath = config.getEnv('endpoints.rest');
		const prefix = `/${[restBasePath, controllerBasePath].join('/')}`
			.replace(/\/+/g, '/')
			.replace(/\/$/, '');

		const controllerMiddlewares = (
			(Reflect.getMetadata(CONTROLLER_MIDDLEWARES, controllerClass) ?? []) as MiddlewareMetadata[]
		).map(
			({ handlerName }) =>
				(controller as Controller)[handlerName].bind(controller) as RequestHandler,
		);

		routes.forEach(({ method, path, middlewares: routeMiddlewares, handlerName }) => {
			const authRole = authRoles && (authRoles[handlerName] ?? authRoles['*']);
			router[method](
				path,
				...(authRole ? [createAuthMiddleware(authRole)] : []),
				...controllerMiddlewares,
				...routeMiddlewares,
				send(async (req: Request, res: Response) =>
					(controller as Controller)[handlerName](req, res),
				),
			);
			if (!authRole || authRole === 'none') authFreeRoutes.push(`${method} ${prefix}${path}`);
		});

		app.use(prefix, router);
	}
};
