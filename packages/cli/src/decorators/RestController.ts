/* eslint-disable @typescript-eslint/naming-convention */
import { CONTROLLER_BASE_PATH } from './constants';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target: object) => {
		Reflect.defineMetadata(CONTROLLER_BASE_PATH, basePath, target);
	};
