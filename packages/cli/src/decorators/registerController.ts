/* eslint-disable @typescript-eslint/naming-convention */
import { Router } from 'express';
import type { Config } from '@/config';
import { CONTROLLER_BASE_PATH, CONTROLLER_ROUTES } from './constants';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import type { Application, Request, Response } from 'express';
import type { Controller, RouteMetadata } from './types';

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

		routes.forEach(({ method, path, handlerName }) => {
			router[method](
				path,
				send(async (req: Request, res: Response) =>
					(controller as Controller)[handlerName](req, res),
				),
			);
		});

		app.use(prefix, router);
	}
};
