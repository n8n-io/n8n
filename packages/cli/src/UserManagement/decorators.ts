/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
import { Application, Request, RequestHandler as Middleware, Response, Router } from 'express';
import { posix } from 'path';
import { ResponseHelper } from '..';
import config from '../../config';

interface RequestHandler<ReqBody, ResBody> extends Function {
	async(req: Request<unknown, ResBody, ReqBody>, res: Response<ResBody>): Promise<ReqBody>;
}

export interface IRouter {
	method: Method;
	path: string;
	handlerName: string | symbol;
}

const Keys = {
	ROUTES: Symbol('routes'),
	BASE_PATH: Symbol('base_path'),
} as const;

export enum Method {
	GET = 'get',
	POST = 'post',
	PATCH = 'patch',
	DELETE = 'delete',
}

export const RestController =
	(basePath = '/'): ClassDecorator =>
	(target: object) => {
		Reflect.defineMetadata(Keys.BASE_PATH, basePath, target);
	};

const RouteFactory =
	(...methods: Method[]) =>
	(path = '/'): MethodDecorator =>
	(target, handlerName) => {
		const ControllerClass = target.constructor;
		const routers: IRouter[] = Reflect.hasMetadata(Keys.ROUTES, ControllerClass)
			? (Reflect.getMetadata(Keys.ROUTES, ControllerClass) as IRouter[])
			: [];
		methods.forEach((method) => {
			routers.push({ method, path, handlerName });
		});

		Reflect.defineMetadata(Keys.ROUTES, routers, ControllerClass);
	};

export const Get = RouteFactory(Method.GET);
export const Post = RouteFactory(Method.POST);
export const Patch = RouteFactory(Method.PATCH);
export const Delete = RouteFactory(Method.DELETE);

export interface Controller<T> extends Function {
	new (...args: unknown[]): T;
}

export const registerController = <T>(
	app: Application,
	ControllerClass: Controller<T>,
	...middlewares: Middleware[]
): void => {
	const instance = new ControllerClass() as unknown as {
		[handleName: string]: RequestHandler<unknown, unknown>;
	};
	const routes: IRouter[] = Reflect.getMetadata(Keys.ROUTES, ControllerClass);
	if (routes.length > 0) {
		const router = Router({ mergeParams: true });
		const restEndpoint: string = config.get('endpoints.rest');
		const basePath: string = Reflect.getMetadata(Keys.BASE_PATH, ControllerClass);
		const prefix = `/${posix.join(restEndpoint, basePath)}`;

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
