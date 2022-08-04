/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
import { Application, Request, RequestHandler as Middleware, Response, Router } from 'express';
import { ResponseHelper } from '..';
import config from '../../config';

export interface RouteMetadata {
	method: Method;
	path: string;
	handlerName: string | symbol;
}

const Keys = {
	ROUTES: Symbol('routes'),
	BASE_PATH: Symbol('base_path'),
} as const;

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target: object) => {
		Reflect.defineMetadata(Keys.BASE_PATH, basePath, target);
	};

const RouteFactory =
	(...methods: Method[]) =>
	(path: `/${string}`): MethodDecorator =>
	(target, handlerName) => {
		const ControllerClass = target.constructor;
		const routes: RouteMetadata[] = Reflect.getMetadata(Keys.ROUTES, ControllerClass) ?? [];
		methods.forEach((method) => {
			routes.push({ method, path, handlerName });
		});

		Reflect.defineMetadata(Keys.ROUTES, routes, ControllerClass);
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Patch = RouteFactory('patch');
export const Put = RouteFactory('put');
export const Delete = RouteFactory('delete');

type RequestHandler = (req: Request, res: Response) => Promise<unknown>;

interface Controller<T> {
	new (...args: unknown[]): T;
}

export const registerController = <T>(
	app: Application,
	ControllerClass: Controller<T>,
	...middlewares: Middleware[]
): void => {
	const instance = new ControllerClass() as unknown as Record<string, RequestHandler>;
	const routes: RouteMetadata[] = Reflect.getMetadata(Keys.ROUTES, ControllerClass);
	if (routes.length) {
		const router = Router({ mergeParams: true });
		const restEndpoint: string = config.getEnv('endpoints.rest');
		const basePath: string = Reflect.getMetadata(Keys.BASE_PATH, ControllerClass);
		const prefix = `/${[restEndpoint, basePath].join('/')}`.replace(/\/+/g, '/');

		routes.forEach(({ method, path, handlerName }) => {
			router[method](
				path,
				...middlewares,
				ResponseHelper.send(async (req: Request, res: Response) =>
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					instance[String(handlerName)].call(instance, req, res),
				),
			);
		});

		app.use(prefix, router);
	}
};
