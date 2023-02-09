/* eslint-disable @typescript-eslint/naming-convention */
import type { RequestHandler } from 'express';
import { CONTROLLER_BASE_PATH, CONTROLLER_MIDDLEWARES } from './constants';

export const RestController =
	(basePath: `/${string}` = '/', ...middlewares: RequestHandler[]): ClassDecorator =>
	(target: object) => {
		Reflect.defineMetadata(CONTROLLER_BASE_PATH, basePath, target);
		Reflect.defineMetadata(CONTROLLER_MIDDLEWARES, middlewares, target);
	};
