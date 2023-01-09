/* eslint-disable @typescript-eslint/naming-convention */
import { BASE_PATH } from './constants';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target: object) => {
		Reflect.defineMetadata(BASE_PATH, basePath, target);
	};
