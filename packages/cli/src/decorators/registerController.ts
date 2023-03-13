/* eslint-disable @typescript-eslint/naming-convention */
import { Router } from 'express';
import type { Config } from '@/config';
import { CONTROLLER_BASE_PATH, CONTROLLER_MIDDLEWARES, CONTROLLER_ROUTES } from './constants';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import type { Application, Request, Response, RequestHandler } from 'express';
import type { Controller, MiddlewareMetadata, RouteMetadata } from './types';

export const registerController = (app: Application, config: Config, controller: object) => {
	const controllerClass = controller.constructor;
	const controllerBasePath = Reflect.getMetadata(CONTROLLER_BASE_PATH, controllerClass) as
		| string
		| undefined;
	if (!controllerBasePath)
		throw new Error(`${controllerClass.name} is missing the RestController decorator`);

	const routes = Reflect.getMetadata(CONTROLLER_ROUTES, controllerClass) as RouteMetadata[];
	if (routes.length > 0) {
		const router = Router({ mergeParams: true });
		const restBasePath = config.getEnv('endpoints.rest');
		const prefix = `/${[restBasePath, controllerBasePath].join('/')}`.replace(/\/+/g, '/');

		const controllerMiddlewares = (
			(Reflect.getMetadata(CONTROLLER_MIDDLEWARES, controllerClass) ?? []) as MiddlewareMetadata[]
		).map(
			({ handlerName }) =>
				(controller as Controller)[handlerName].bind(controller) as RequestHandler,
		);

		routes.forEach(({ method, path, middlewares: routeMiddlewares, handlerName }) => {
			router[method](
				path,
				...controllerMiddlewares,
				...routeMiddlewares,
				send(async (req: Request, res: Response) =>
					(controller as Controller)[handlerName](req, res),
				),
			);
		});

		app.use(prefix, router);
	}
};
